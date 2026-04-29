import pandas as pd
import requests
import json
import os
from django.conf import settings
from django.http import JsonResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import TelemetryRecord
from .serializers import TelemetrySerializer
from .ml.inference import analyse_dataframe

# ==========================================
# EXISTING VIEWS
# ==========================================

def get_satellite_location(request):
    # NORAD ID 25544 is the ISS - great for testing!
    # Replace 'YOUR_API_KEY' with your key from n2yo.com
    api_key = "ZDAWVF-BB7EED-92BJJQ-5NGQ"
    url = f"https://api.n2yo.com/rest/v1/satellite/positions/25544/0/0/0/3000/&apiKey={api_key}"
    
    try:
        response = requests.get(url)
        return JsonResponse(response.json())
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# Data for Home and Telemetry pages
class TelemetryListView(generics.ListAPIView):
    queryset = TelemetryRecord.objects.all()[:200] # Return latest 200 rows
    serializer_class = TelemetrySerializer

@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "satellite-backend"})

# ==========================================
# METRICS API VIEW (FOR REPORTS PAGE)
# ==========================================

@api_view(['GET'])
def get_training_metrics(request):
    """API Endpoint to fetch the latest AI training metrics for the Reports page."""
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
# ML PIPELINE VIEW
# ==========================================

@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_telemetry(request):
    """
    Accepts a .csv or .xlsx telemetry file from the React frontend, 
    processes it through the STAR-Pulse ML ensemble, and returns JSON.
    """
    file_obj = request.FILES.get('file')
    
    if not file_obj:
        return Response(
            {"error": "No file provided. Please upload a file using the 'file' key."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    filename = file_obj.name.lower()
    
    try:
        # File type validation and reading into Pandas
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_obj, engine='openpyxl')
        else:
            return Response(
                {"error": "Unsupported file format. Please upload a .csv or .xlsx file."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Empty file validation
        if df.empty:
            return Response(
                {"error": "The uploaded file contains no data."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Pass the DataFrame to the inference engine
        result_data = analyse_dataframe(df)
        
        # Return the clean JSON payload to React
        return Response(result_data, status=status.HTTP_200_OK)

    except ValueError as ve:
        # Catches the missing columns error from inference.py
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Failsafe for unexpected errors
        return Response(
            {"error": f"An error occurred during AI processing: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )