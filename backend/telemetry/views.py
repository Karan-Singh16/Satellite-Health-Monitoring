import pandas as pd
import requests
import json
import os
from django.conf import settings
from django.http import JsonResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import TelemetryRecord, UserSession, TelemetryUpload, BenchmarkResult
from .serializers import TelemetrySerializer

# Maps each ML feature name to its channel ID, human label, and subsystem group
# Used when bulk-inserting TelemetryRecord rows after inference
FEATURE_MAP = {
    'battery_voltage':    ('EPS_VOLT_01', 'Battery Voltage',     'Power (EPS)'),
    'average_current':    ('EPS_CURR_01', 'Avg Current',         'Power (EPS)'),
    'average_power':      ('EPS_PWR_01',  'Avg Power',           'Power (EPS)'),
    'remaining_capacity': ('EPS_CAP_01',  'Remaining Capacity',  'Power (EPS)'),
    'gyro_X':             ('GYRO_X_01',   'Gyro X',              'Attitude (ADCS)'),
    'gyro_Y':             ('GYRO_Y_01',   'Gyro Y',              'Attitude (ADCS)'),
    'gyro_Z':             ('GYRO_Z_01',   'Gyro Z',              'Attitude (ADCS)'),
    'EPS_temperature':    ('EPS_TEMP_01', 'EPS Temperature',     'Thermal (TCS)'),
    'ADCS_temperature1':  ('ADCS_TMP_01', 'ADCS Temperature',    'Thermal (TCS)'),
    'BNO055_temperature': ('BNO_TEMP_01', 'BNO055 Temperature',  'Thermal (TCS)'),
}

# ==========================================
# AUTH VIEWS
# ==========================================

@api_view(['POST'])
@permission_classes([AllowAny])  # public — no token required to register
def register_user(request):
    username  = request.data.get('username')
    password  = request.data.get('password')
    email     = request.data.get('email')
    full_name = request.data.get('full_name', '').strip()

    if not username or not password:
        return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)
    if full_name:
        # Django's built-in first_name field stores the display name
        user.first_name = full_name
        user.save()

    # DRF token created on registration — returned to frontend and stored in localStorage
    token, _ = Token.objects.get_or_create(user=user)
    display_name = user.first_name or user.username
    return Response({"token": token.key, "username": user.username, "display_name": display_name}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])  # public — no token required to log in
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    # Django's authenticate checks credentials against the hashed password in the DB
    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    # Record the login event with IP address for audit trail
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
    UserSession.objects.create(user=user, ip_address=ip)

    token, _ = Token.objects.get_or_create(user=user)
    display_name = user.first_name or user.username
    return Response({"token": token.key, "username": user.username, "display_name": display_name})


# ==========================================
# SATELLITE TRACKING
# ==========================================

def get_satellite_location(request):
    # Proxies the N2YO API call through Django so the API key is never exposed to the browser
    # NORAD ID 25544 = ISS; returns 3000 future position predictions
    api_key = "ZDAWVF-BB7EED-92BJJQ-5NGQ"
    url = f"https://api.n2yo.com/rest/v1/satellite/positions/25544/0/0/0/3000/&apiKey={api_key}"
    try:
        response = requests.get(url)
        return JsonResponse(response.json())
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ==========================================
# TELEMETRY LIST & HEALTH
# ==========================================

# Returns the latest 200 TelemetryRecord rows — used by the Telemetry page
class TelemetryListView(generics.ListAPIView):
    queryset = TelemetryRecord.objects.all()[:200]
    serializer_class = TelemetrySerializer


@api_view(["GET"])
def health(request):
    # Simple liveness check — confirms Django is running and reachable
    return Response({"status": "ok", "service": "satellite-backend"})


# ==========================================
# TRAINING METRICS (REPORTS PAGE)
# ==========================================

@api_view(['GET'])
def get_training_metrics(request):
    # Reads training_metrics.json written by train_models.py and returns it as JSON
    # Contains flag rates, consensus counts, and feature trigger frequencies
    metrics_path = os.path.join(settings.BASE_DIR, 'telemetry', 'ml', 'artifacts', 'training_metrics.json')
    try:
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
        return JsonResponse(metrics)
    except FileNotFoundError:
        return JsonResponse({
            "f1_score": 0.0,
            "accuracy": 0.0,
            "confusion_matrix": {"tn": 0, "fp": 0, "fn": 0, "tp": 0}
        }, status=404)


# ==========================================
# ML PIPELINE — TELEMETRY UPLOAD
# ==========================================

@api_view(['POST'])
@parser_classes([MultiPartParser])   # required to handle multipart file uploads
@permission_classes([IsAuthenticated])
def upload_telemetry(request):
    """
    Core pipeline endpoint. Accepts a CSV/XLSX, runs ML inference,
    saves results to the DB, saves the original file to disk,
    and bulk-inserts individual sensor readings into TelemetryRecord.
    """
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

    original_filename = file_obj.name
    filename_lower    = original_filename.lower()

    try:
        # Read file into pandas DataFrame based on extension
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename_lower.endswith('.xlsx') or filename_lower.endswith('.xls'):
            df = pd.read_excel(file_obj, engine='openpyxl')
        else:
            return Response({"error": "Unsupported file format. Upload .csv or .xlsx."}, status=status.HTTP_400_BAD_REQUEST)

        if df.empty:
            return Response({"error": "The uploaded file contains no data."}, status=status.HTTP_400_BAD_REQUEST)

        # Lazy import keeps Django startable with the lightweight venv (no sklearn needed at boot)
        from .ml.inference import analyse_dataframe
        result_data = analyse_dataframe(df)

        # Separate anomalous rows for the Anomalies page; take first 150 rows for chart rendering
        anomalies_only = [r for r in result_data['per_row_results'] if r.get('Flight_Ready_Anomaly') == 1]
        timeseries     = result_data['per_row_results'][:150]

        # seek(0) rewinds the file pointer after pandas consumed it, so Django can re-read it for saving
        file_obj.seek(0)
        upload = TelemetryUpload(
            user=request.user,
            filename=original_filename,
            summary=result_data['summary'],
            anomalies_json=anomalies_only,
            timeseries_json=timeseries,
        )
        # datafile.save() writes the file to backend/media/telemetry/YYYY/MM/ and saves the model
        upload.datafile.save(original_filename, file_obj, save=True)

        # Bulk-insert: 10 channels × N rows = up to 759,940 TelemetryRecord rows per upload
        # bulk_create with batch_size=500 is significantly faster than individual .save() calls
        from datetime import datetime, timezone as tz
        records = []
        for row in result_data['per_row_results']:
            ts_raw = row.get('timestamp')
            try:
                ts = datetime.fromisoformat(ts_raw).replace(tzinfo=tz.utc) if ts_raw else None
            except ValueError:
                ts = None

            if ts is None:
                continue

            is_anomaly = bool(row.get('Final_Anomaly', 0))
            score      = row.get('IF_Anomaly_Score')

            for feature, (channel_id, label, subsystem) in FEATURE_MAP.items():
                records.append(TelemetryRecord(
                    upload=upload,
                    timestamp=ts,
                    channel_id=channel_id,
                    label=label,
                    value=float(row.get(feature, 0.0)),
                    subsystem=subsystem,
                    is_anomaly=is_anomaly,
                    anomaly_score=score,
                ))

        TelemetryRecord.objects.bulk_create(records, batch_size=500)

        return Response(result_data, status=status.HTTP_200_OK)

    except ValueError as ve:
        # Raised by inference.py when required columns are missing from the uploaded file
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"An error occurred during AI processing: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==========================================
# UPLOAD HISTORY
# ==========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upload_history(request):
    # Returns lightweight summaries only — full results fetched separately to keep response small
    uploads = TelemetryUpload.objects.filter(user=request.user)
    data = [
        {
            "id": u.id,
            "filename": u.filename,
            "uploaded_at": u.uploaded_at.isoformat(),
            "total_rows": u.summary.get('total_rows', 0),
            "flight_ready_anomalies": u.summary.get('flight_ready_anomalies', 0),
        }
        for u in uploads
    ]
    return JsonResponse(data, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upload_history_detail(request, pk):
    # Fetches the full stored results for one upload so the frontend can restore that session
    try:
        upload = TelemetryUpload.objects.get(pk=pk, user=request.user)
    except TelemetryUpload.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return JsonResponse({
        "summary":       upload.summary,
        "anomalies_only": upload.anomalies_json,
        "timeseries":    upload.timeseries_json,
    })


# ==========================================
# BENCHMARK / SUPERVISED EVALUATION
# ==========================================

# Case-insensitive accepted column names for the ground-truth label
GROUND_TRUTH_COLS = {'ground_truth', 'is_anomaly', 'anomaly', 'label'}

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def upload_benchmark(request):
    """
    Accepts a labelled file (same telemetry columns + a ground_truth column: 0=normal, 1=anomaly).
    Runs inference, compares predictions to ground truth, and saves F1/precision/recall/AUC-ROC.
    Only meaningful metric path in the project — the training set is fully unsupervised.
    """
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

    original_filename = file_obj.name
    filename_lower    = original_filename.lower()

    try:
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename_lower.endswith('.xlsx') or filename_lower.endswith('.xls'):
            df = pd.read_excel(file_obj, engine='openpyxl')
        else:
            return Response({"error": "Unsupported format."}, status=status.HTTP_400_BAD_REQUEST)

        if df.empty:
            return Response({"error": "File contains no data."}, status=status.HTTP_400_BAD_REQUEST)

        # Find the ground-truth column regardless of exact capitalisation
        col_map = {c.lower(): c for c in df.columns}
        gt_key  = next((col_map[k] for k in GROUND_TRUTH_COLS if k in col_map), None)
        if gt_key is None:
            return Response(
                {"error": f"No ground-truth column found. Add one named: {', '.join(GROUND_TRUTH_COLS)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        y_true = df[gt_key].astype(int).values

        from .ml.inference import analyse_dataframe
        from sklearn.metrics import (
            f1_score, precision_score, recall_score,
            accuracy_score, roc_auc_score, confusion_matrix
        )

        result_data = analyse_dataframe(df)
        y_pred   = [int(r['Final_Anomaly'])      for r in result_data['per_row_results']]
        # IF_Anomaly_Score used as continuous score for AUC-ROC (higher = more anomalous)
        y_scores = [float(r['IF_Anomaly_Score'])  for r in result_data['per_row_results']]

        # Trim to shortest in case inference dropped rows during datetime parsing
        min_len  = min(len(y_true), len(y_pred))
        y_true   = y_true[:min_len]
        y_pred   = y_pred[:min_len]
        y_scores = y_scores[:min_len]

        cm = confusion_matrix(y_true, y_pred).tolist()

        try:
            auc = round(float(roc_auc_score(y_true, y_scores)), 4)
        except ValueError:
            auc = None  # roc_auc_score fails if y_true contains only one class

        metrics = {
            "filename":         original_filename,
            "total_rows":       min_len,
            "anomaly_count":    int(sum(y_true)),
            "f1_score":         round(float(f1_score(y_true,        y_pred, zero_division=0)), 4),
            "precision":        round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall":           round(float(recall_score(y_true,    y_pred, zero_division=0)), 4),
            "accuracy":         round(float(accuracy_score(y_true,  y_pred)),                  4),
            "auc_roc":          auc,
            "confusion_matrix": cm,
        }

        BenchmarkResult.objects.create(user=request.user, **metrics)
        return JsonResponse(metrics)

    except ValueError as ve:
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"Benchmark error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_latest_benchmark(request):
    # Returns the most recent benchmark for this user — ordered by -uploaded_at in Meta
    result = BenchmarkResult.objects.filter(user=request.user).first()
    if not result:
        return Response({"detail": "No benchmark uploaded yet."}, status=status.HTTP_404_NOT_FOUND)

    return JsonResponse({
        "filename":         result.filename,
        "uploaded_at":      result.uploaded_at.isoformat(),
        "total_rows":       result.total_rows,
        "anomaly_count":    result.anomaly_count,
        "f1_score":         result.f1_score,
        "precision":        result.precision,
        "recall":           result.recall,
        "accuracy":         result.accuracy,
        "auc_roc":          result.auc_roc,
        "confusion_matrix": result.confusion_matrix,
    })
