import os
import joblib
import pandas as pd
import numpy as np
import json
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

from telemetry.ml.features import (
    selected_features,
    parse_datetime_column,
    engineer_feature_specific
)
from telemetry.ml.config import (
    GLOBAL_IF_CONTAM, GLOBAL_LOF_CONTAM, GLOBAL_SVM_NU, GLOBAL_VOTE_THRESHOLD,
    FEAT_IF_CONTAM, FEAT_LOF_CONTAM, FEAT_SVM_NU, FEAT_CONSENSUS_THRESHOLD, FEAT_VOTE_THRESHOLD
)

BASE_DIR = Path(__file__).resolve().parents[3]          # = backend/
ARTIFACTS_DIR = BASE_DIR / "telemetry" / "ml" / "artifacts"
DATA_FILE = BASE_DIR.parent / "telemetry.xlsx"          # telemetry.xlsx lives in repo root

def main():
    print(f"Loading dataset from {DATA_FILE}")
    df = pd.read_excel(DATA_FILE)

    df = parse_datetime_column(df)
    for col in selected_features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    print(f"Dataset shape: {df.shape}")

    # Chronological 70/30 split for training and testing
    split_point = int(len(df) * 0.70)
    train_df = df.iloc[:split_point].copy()
    test_df = df.iloc[split_point:].copy()
    print(f"Training rows: {len(train_df)} | Test rows: {len(test_df)}")

    GLOBAL_DIR = ARTIFACTS_DIR / "global"
    FEAT_DIR = ARTIFACTS_DIR / "features"
    GLOBAL_DIR.mkdir(parents=True, exist_ok=True)
    FEAT_DIR.mkdir(parents=True, exist_ok=True)

    # --- MODEL 1: GLOBAL MODEL (fit on train, evaluate on test) ---
    print("\n--- Training Global Model ---")
    X_train = train_df[selected_features].copy()
    X_test = test_df[selected_features].copy()

    imputer_global = SimpleImputer(strategy="mean")
    scaler_global = StandardScaler()

    X_train_imputed = imputer_global.fit_transform(X_train)
    X_train_scaled = scaler_global.fit_transform(X_train_imputed)

    X_test_imputed = imputer_global.transform(X_test)
    X_test_scaled = scaler_global.transform(X_test_imputed)

    global_if = IsolationForest(n_estimators=100, contamination=GLOBAL_IF_CONTAM, random_state=42)
    global_if.fit(X_train_scaled)

    global_lof = LocalOutlierFactor(n_neighbors=250, contamination=GLOBAL_LOF_CONTAM, novelty=True)
    global_lof.fit(X_train_scaled)

    global_svm = OneClassSVM(nu=GLOBAL_SVM_NU, kernel="rbf", gamma=0.001)
    global_svm.fit(X_train_scaled)

    # Evaluate on test set
    vote_if = (global_if.predict(X_test_scaled) == -1).astype(int)
    vote_lof = (global_lof.predict(X_test_scaled) == -1).astype(int)
    vote_svm = (global_svm.predict(X_test_scaled) == -1).astype(int)
    global_vote_sum = vote_if + vote_lof + vote_svm
    global_prediction = (global_vote_sum >= GLOBAL_VOTE_THRESHOLD).astype(int)

    total_test = len(test_df)
    if_flags = int(vote_if.sum())
    lof_flags = int(vote_lof.sum())
    svm_flags = int(vote_svm.sum())
    global_consensus_count = int(global_prediction.sum())

    print(f"  IF flags: {if_flags} ({if_flags/total_test*100:.2f}%)")
    print(f"  LOF flags: {lof_flags} ({lof_flags/total_test*100:.2f}%)")
    print(f"  SVM flags: {svm_flags} ({svm_flags/total_test*100:.2f}%)")
    print(f"  Global consensus (all 3): {global_consensus_count} ({global_consensus_count/total_test*100:.2f}%)")

    joblib.dump(imputer_global, GLOBAL_DIR / "imputer.joblib")
    joblib.dump(scaler_global, GLOBAL_DIR / "scaler.joblib")
    joblib.dump(global_if, GLOBAL_DIR / "if_model.joblib")
    joblib.dump(global_lof, GLOBAL_DIR / "lof_model.joblib")
    joblib.dump(global_svm, GLOBAL_DIR / "svm_model.joblib")

    # --- MODEL 2: FEATURE-SPECIFIC MODELS ---
    print("\n--- Training Feature-Specific Models ---")
    m2_votes = np.zeros(total_test)
    m2_triggered_lists = [[] for _ in range(total_test)]

    for feature in selected_features:
        print(f"  Processing: {feature}")
        feat_df_full = engineer_feature_specific(df, feature)
        feat_train = feat_df_full.iloc[:split_point].copy()
        feat_test = feat_df_full.iloc[split_point:].copy()

        imputer_feat = SimpleImputer(strategy="mean")
        scaler_feat = StandardScaler()

        feat_train_imputed = imputer_feat.fit_transform(feat_train)
        feat_train_scaled = scaler_feat.fit_transform(feat_train_imputed)

        feat_test_imputed = imputer_feat.transform(feat_test)
        feat_test_scaled = scaler_feat.transform(feat_test_imputed)

        f_if = IsolationForest(n_estimators=50, contamination=FEAT_IF_CONTAM, random_state=42)
        f_if.fit(feat_train_scaled)

        f_lof = LocalOutlierFactor(n_neighbors=150, contamination=FEAT_LOF_CONTAM, novelty=True)
        f_lof.fit(feat_train_scaled)

        f_svm = OneClassSVM(nu=FEAT_SVM_NU, kernel="rbf", gamma='auto')
        f_svm.fit(feat_train_scaled)

        vote_f_if = (f_if.predict(feat_test_scaled) == -1).astype(int)
        vote_f_lof = (f_lof.predict(feat_test_scaled) == -1).astype(int)
        vote_f_svm = (f_svm.predict(feat_test_scaled) == -1).astype(int)

        feat_vote_sum = vote_f_if + vote_f_lof + vote_f_svm
        feat_consensus = (feat_vote_sum >= FEAT_CONSENSUS_THRESHOLD).astype(int)

        for i, is_anom in enumerate(feat_consensus):
            if is_anom:
                m2_votes[i] += 1
                m2_triggered_lists[i].append(feature)

        feat_path = FEAT_DIR / feature
        feat_path.mkdir(parents=True, exist_ok=True)
        joblib.dump(imputer_feat, feat_path / "imputer.joblib")
        joblib.dump(scaler_feat, feat_path / "scaler.joblib")
        joblib.dump(f_if, feat_path / "if_model.joblib")
        joblib.dump(f_lof, feat_path / "lof_model.joblib")
        joblib.dump(f_svm, feat_path / "svm_model.joblib")

    feature_prediction = (m2_votes >= FEAT_VOTE_THRESHOLD).astype(int)
    feature_consensus_count = int(feature_prediction.sum())

    final_anomaly = (global_prediction == 1) | (feature_prediction == 1)
    combined_count = int(final_anomaly.sum())

    agreements = int((global_prediction == feature_prediction).sum())

    print(f"\n  Feature consensus flags: {feature_consensus_count} ({feature_consensus_count/total_test*100:.2f}%)")
    print(f"  Combined flags (Global OR Feature): {combined_count} ({combined_count/total_test*100:.2f}%)")
    print(f"  Global/Feature agreement rate: {agreements/total_test*100:.2f}%")

    # Per-feature anomaly trigger counts (for Reports page feature importance)
    feature_trigger_counts = {}
    for feat_list in m2_triggered_lists:
        for f in feat_list:
            feature_trigger_counts[f] = feature_trigger_counts.get(f, 0) + 1

    metrics = {
        "training_rows": len(train_df),
        "test_rows": total_test,
        "global_if_flags": if_flags,
        "global_lof_flags": lof_flags,
        "global_svm_flags": svm_flags,
        "global_if_flag_rate": round(if_flags / total_test * 100, 2),
        "global_lof_flag_rate": round(lof_flags / total_test * 100, 2),
        "global_svm_flag_rate": round(svm_flags / total_test * 100, 2),
        "global_consensus_count": global_consensus_count,
        "global_consensus_rate": round(global_consensus_count / total_test * 100, 2),
        "feature_consensus_count": feature_consensus_count,
        "feature_consensus_rate": round(feature_consensus_count / total_test * 100, 2),
        "combined_anomaly_count": combined_count,
        "combined_anomaly_rate": round(combined_count / total_test * 100, 2),
        "agreement_rate": round(agreements / total_test * 100, 2),
        "feature_trigger_counts": feature_trigger_counts,
    }

    with open(ARTIFACTS_DIR / "training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)

    print("\nAll artifacts and real metrics saved successfully.")
    print(f"Metrics: {json.dumps(metrics, indent=2)}")

if __name__ == "__main__":
    main()
