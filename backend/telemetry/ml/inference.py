import os
import time
import joblib
import pandas as pd
import numpy as np
from django.conf import settings
from .features import parse_datetime_column, engineer_feature_specific, selected_features
from .config import GLOBAL_VOTE_THRESHOLD, FEAT_CONSENSUS_THRESHOLD, FEAT_VOTE_THRESHOLD

# Paths to the trained model artifacts saved after running train_models.py
ARTIFACTS_DIR = os.path.join(settings.BASE_DIR, 'telemetry', 'ml', 'artifacts')
GLOBAL_DIR = os.path.join(ARTIFACTS_DIR, 'global')
FEAT_DIR = os.path.join(ARTIFACTS_DIR, 'features')

def load_global_artifacts():
    # Loads the 5 global artifacts: imputer, scaler, and 3 anomaly detectors
    imputer = joblib.load(os.path.join(GLOBAL_DIR, 'imputer.joblib'))
    scaler = joblib.load(os.path.join(GLOBAL_DIR, 'scaler.joblib'))
    model_if = joblib.load(os.path.join(GLOBAL_DIR, 'if_model.joblib'))
    model_lof = joblib.load(os.path.join(GLOBAL_DIR, 'lof_model.joblib'))
    model_svm = joblib.load(os.path.join(ARTIFACTS_DIR, 'global', 'svm_model.joblib'))
    return imputer, scaler, model_if, model_lof, model_svm

def load_feature_artifacts(feature):
    # Each of the 10 sensors has its own trained set of 5 artifacts
    path = os.path.join(FEAT_DIR, feature)
    imputer = joblib.load(os.path.join(path, 'imputer.joblib'))
    scaler = joblib.load(os.path.join(path, 'scaler.joblib'))
    model_if = joblib.load(os.path.join(path, 'if_model.joblib'))
    model_lof = joblib.load(os.path.join(path, 'lof_model.joblib'))
    model_svm = joblib.load(os.path.join(path, 'svm_model.joblib'))
    return imputer, scaler, model_if, model_lof, model_svm

# Module-level cache so artifacts are only loaded from disk once per server lifetime
GLOBAL_ARTIFACTS = None
FEATURE_ARTIFACTS = {}

def get_artifacts():
    # Lazy-load: first request pays the disk I/O cost, all subsequent requests use memory
    global GLOBAL_ARTIFACTS, FEATURE_ARTIFACTS
    if GLOBAL_ARTIFACTS is None:
        GLOBAL_ARTIFACTS = load_global_artifacts()
        for feature in selected_features:
            FEATURE_ARTIFACTS[feature] = load_feature_artifacts(feature)
    return GLOBAL_ARTIFACTS, FEATURE_ARTIFACTS

def extract_top_causes_from_feature_specific(row_idx, m2_triggered_lists):
    # Returns the list of sensor features that triggered Model 2 for this specific row
    features = m2_triggered_lists[row_idx]
    return [{"feature": f, "score": 1.0} for f in features]

def analyse_dataframe(df):
    """
    Main inference entry point called by the Django upload view.
    Runs the two-stage ensemble and returns per-row results + summary stats.
    """
    start_time = time.time()

    # Sort chronologically so temporal features (rolling windows) are computed correctly
    df = parse_datetime_column(df)
    df = df.sort_values('Datetime').reset_index(drop=True)

    total_rows = len(df)

    (imp_g, scal_g, mod_if_g, mod_lof_g, mod_svm_g), feat_artifacts = get_artifacts()

    # --- MODEL 1: GLOBAL ENSEMBLE ---
    # All 10 features fed together — detects cross-channel multivariate anomalies
    X_global_raw = df[selected_features].copy()
    X_global_imputed = imp_g.transform(X_global_raw)   # fills missing values with training mean
    X_global_scaled = scal_g.transform(X_global_imputed) # normalises to training distribution

    # Each model votes: -1 (anomaly) becomes 1, +1 (normal) becomes 0
    vote_if_g = (mod_if_g.predict(X_global_scaled) == -1).astype(int)
    vote_lof_g = (mod_lof_g.predict(X_global_scaled) == -1).astype(int)
    vote_svm_g = (mod_svm_g.predict(X_global_scaled) == -1).astype(int)

    global_vote_sum = vote_if_g + vote_lof_g + vote_svm_g
    # Unanimous agreement required: all 3 must vote anomaly (threshold = 3)
    global_prediction = (global_vote_sum >= GLOBAL_VOTE_THRESHOLD).astype(int)

    # Negated decision function: higher positive value = more anomalous
    # Used to compute deviation intensity percentage in the frontend
    df['IF_Anomaly_Score'] = -mod_if_g.decision_function(X_global_scaled)

    # --- MODEL 2: FEATURE-SPECIFIC ENSEMBLE ---
    # Each sensor is analysed independently using temporal features (diff, rolling stats, drift)
    m2_votes = np.zeros(total_rows)
    m2_triggered_lists = [[] for _ in range(total_rows)]

    for feature in selected_features:
        imp_f, scal_f, mod_if_f, mod_lof_f, mod_svm_f = feat_artifacts[feature]

        # engineer_feature_specific builds: raw, diff, roll_mean, roll_std, drift
        feat_df = engineer_feature_specific(df, feature)
        feat_imputed = imp_f.transform(feat_df)
        feat_scaled = scal_f.transform(feat_imputed)

        vote_if_f = (mod_if_f.predict(feat_scaled) == -1).astype(int)
        vote_lof_f = (mod_lof_f.predict(feat_scaled) == -1).astype(int)
        vote_svm_f = (mod_svm_f.predict(feat_scaled) == -1).astype(int)

        feat_vote_sum = vote_if_f + vote_lof_f + vote_svm_f
        # A single sensor is flagged only if all 3 models agree
        feat_consensus = (feat_vote_sum >= FEAT_CONSENSUS_THRESHOLD).astype(int)

        for i, is_anom in enumerate(feat_consensus):
            if is_anom:
                m2_votes[i] += 1
                m2_triggered_lists[i].append(feature)

    # Row flagged by Model 2 only if 3 or more individual sensors triggered
    feature_prediction = (m2_votes >= FEAT_VOTE_THRESHOLD).astype(int)

    # --- FINAL DECISION: union of both models ---
    # A row is anomalous if Model 1 OR Model 2 flags it
    final_anomaly = (global_prediction == 1) | (feature_prediction == 1)
    df['Final_Anomaly'] = final_anomaly.astype(int)

    # Build the per-row result list returned to the frontend
    results = []
    for idx, row in df.iterrows():
        causes = []
        if feature_prediction[idx] == 1:
            # Feature-specific: show which sensors triggered
            causes = extract_top_causes_from_feature_specific(idx, m2_triggered_lists)
        elif global_prediction[idx] == 1:
            # Global-only: no single sensor identified, flag as multivariate
            causes = [{"feature": "Global Ensemble", "score": 1.0}]

        row_dict = {
            "timestamp": row['Datetime'].isoformat() if pd.notnull(row['Datetime']) else None,
            "Vote_IF": int(vote_if_g[idx]),
            "Vote_LOF": int(vote_lof_g[idx]),
            "Vote_SVM": int(vote_svm_g[idx]),
            "Global_Vote_Sum": int(global_vote_sum[idx]),
            "Global_Prediction": int(global_prediction[idx]),
            "Feature_Vote_Count": int(m2_votes[idx]),
            "Feature_Prediction": int(feature_prediction[idx]),
            "Final_Anomaly": int(row['Final_Anomaly']),
            "Flight_Ready_Anomaly": int(row['Final_Anomaly']),
            "IF_Anomaly_Score": float(row['IF_Anomaly_Score']),
            "top_causes": causes
        }

        # Attach raw sensor values so the frontend can plot time-series charts
        for feature in selected_features:
            row_dict[feature] = float(row[feature]) if pd.notnull(row[feature]) else 0.0

        results.append(row_dict)

    end_time = time.time()
    latency = round(end_time - start_time, 4)
    throughput = int(total_rows / latency) if latency > 0 else total_rows

    summary = {
        "total_rows": total_rows,
        "raw_anomalies_detected": int(final_anomaly.sum()),
        "flight_ready_anomalies": int(final_anomaly.sum()),
        "performance": {
            "latency": latency,       # seconds to process the full file
            "throughput": throughput, # rows processed per second
        }
    }

    return {
        "summary": summary,
        "per_row_results": results
    }
