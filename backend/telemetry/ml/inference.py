import os
import time
import joblib
import pandas as pd
import numpy as np
from django.conf import settings
from .features import parse_datetime_column, engineer_feature_specific, selected_features
from .config import GLOBAL_VOTE_THRESHOLD, FEAT_CONSENSUS_THRESHOLD, FEAT_VOTE_THRESHOLD

# Dynamically point to the artifacts folder
ARTIFACTS_DIR = os.path.join(settings.BASE_DIR, 'telemetry', 'ml', 'artifacts')
GLOBAL_DIR = os.path.join(ARTIFACTS_DIR, 'global')
FEAT_DIR = os.path.join(ARTIFACTS_DIR, 'features')

def load_global_artifacts():
    imputer = joblib.load(os.path.join(GLOBAL_DIR, 'imputer.joblib'))
    scaler = joblib.load(os.path.join(GLOBAL_DIR, 'scaler.joblib'))
    model_if = joblib.load(os.path.join(GLOBAL_DIR, 'if_model.joblib'))
    model_lof = joblib.load(os.path.join(GLOBAL_DIR, 'lof_model.joblib'))
    model_svm = joblib.load(os.path.join(ARTIFACTS_DIR, 'global', 'svm_model.joblib'))
    return imputer, scaler, model_if, model_lof, model_svm

def load_feature_artifacts(feature):
    path = os.path.join(FEAT_DIR, feature)
    imputer = joblib.load(os.path.join(path, 'imputer.joblib'))
    scaler = joblib.load(os.path.join(path, 'scaler.joblib'))
    model_if = joblib.load(os.path.join(path, 'if_model.joblib'))
    model_lof = joblib.load(os.path.join(path, 'lof_model.joblib'))
    model_svm = joblib.load(os.path.join(path, 'svm_model.joblib'))
    return imputer, scaler, model_if, model_lof, model_svm

# Global cache for artifacts
GLOBAL_ARTIFACTS = None
FEATURE_ARTIFACTS = {}

def get_artifacts():
    global GLOBAL_ARTIFACTS, FEATURE_ARTIFACTS
    if GLOBAL_ARTIFACTS is None:
        GLOBAL_ARTIFACTS = load_global_artifacts()
        for feature in selected_features:
            FEATURE_ARTIFACTS[feature] = load_feature_artifacts(feature)
    return GLOBAL_ARTIFACTS, FEATURE_ARTIFACTS

def extract_top_causes_from_feature_specific(row_idx, m2_triggered_lists):
    """Returns the list of features that triggered Model 2 for this row."""
    features = m2_triggered_lists[row_idx]
    return [{"feature": f, "score": 1.0} for f in features]

def analyse_dataframe(df):
    """The main entry point for the Django view using the Improved ML Ensemble."""
    start_time = time.time()
    
    # 1. Parse Datetime and Sort
    df = parse_datetime_column(df)
    df = df.sort_values('Datetime').reset_index(drop=True)
    
    total_rows = len(df)
    
    # Get Artifacts
    (imp_g, scal_g, mod_if_g, mod_lof_g, mod_svm_g), feat_artifacts = get_artifacts()

    # --- MODEL 1: GLOBAL INFERENCE ---
    X_global_raw = df[selected_features].copy()
    X_global_imputed = imp_g.transform(X_global_raw)
    X_global_scaled = scal_g.transform(X_global_imputed)
    
    vote_if_g = (mod_if_g.predict(X_global_scaled) == -1).astype(int)
    vote_lof_g = (mod_lof_g.predict(X_global_scaled) == -1).astype(int)
    vote_svm_g = (mod_svm_g.predict(X_global_scaled) == -1).astype(int)
    
    global_vote_sum = vote_if_g + vote_lof_g + vote_svm_g
    global_prediction = (global_vote_sum >= GLOBAL_VOTE_THRESHOLD).astype(int)
    
    # Raw IF score for the dashboard gauge
    df['IF_Anomaly_Score'] = -mod_if_g.decision_function(X_global_scaled)

    # --- MODEL 2: FEATURE-SPECIFIC INFERENCE ---
    m2_votes = np.zeros(total_rows)
    m2_triggered_lists = [[] for _ in range(total_rows)]
    
    for feature in selected_features:
        imp_f, scal_f, mod_if_f, mod_lof_f, mod_svm_f = feat_artifacts[feature]
        
        feat_df = engineer_feature_specific(df, feature)
        feat_imputed = imp_f.transform(feat_df)
        feat_scaled = scal_f.transform(feat_imputed)
        
        vote_if_f = (mod_if_f.predict(feat_scaled) == -1).astype(int)
        vote_lof_f = (mod_lof_f.predict(feat_scaled) == -1).astype(int)
        vote_svm_f = (mod_svm_f.predict(feat_scaled) == -1).astype(int)
        
        feat_vote_sum = vote_if_f + vote_lof_f + vote_svm_f
        feat_consensus = (feat_vote_sum >= FEAT_CONSENSUS_THRESHOLD).astype(int)
        
        for i, is_anom in enumerate(feat_consensus):
            if is_anom:
                m2_votes[i] += 1
                m2_triggered_lists[i].append(feature)
                
    feature_prediction = (m2_votes >= FEAT_VOTE_THRESHOLD).astype(int)

    # --- COMBINED PREDICTION ---
    # combined_anomaly = Model 1 anomaly OR Model 2 anomaly
    final_anomaly = (global_prediction == 1) | (feature_prediction == 1)
    df['Final_Anomaly'] = final_anomaly.astype(int)

    # Format Results
    results = []
    for idx, row in df.iterrows():
        causes = []
        if feature_prediction[idx] == 1:
            causes = extract_top_causes_from_feature_specific(idx, m2_triggered_lists)
        elif global_prediction[idx] == 1:
            # If only global triggered, we don't have specific features easily, 
            # but we can list all selected features that are far from mean?
            # For now, let's just say "Global Ensemble Trigger"
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
            "Flight_Ready_Anomaly": int(row['Final_Anomaly']), # Using Final_Anomaly as Flight_Ready for dashboard
            "IF_Anomaly_Score": float(row['IF_Anomaly_Score']),
            "top_causes": causes
        }
        
        # Inject raw sensor data
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
            "latency": latency,
            "throughput": throughput,
        }
    }

    return {
        "summary": summary,
        "per_row_results": results
    }
