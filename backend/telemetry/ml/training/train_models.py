from pathlib import Path
import joblib
import pandas as pd
import numpy as np
import json  # The only new import

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.metrics import f1_score, roc_auc_score, confusion_matrix, precision_score, recall_score

from telemetry.ml.features import (
    selected_features,
    feature_dict,
    advanced_features,
    engineer_features,
    parse_datetime_column,
)
from telemetry.ml.config import (
    WEIGHT_IF,
    WEIGHT_LOF,
    WEIGHT_SVM,
    VOTE_THRESHOLD,
    DEBOUNCE_WINDOW,
    DEBOUNCE_HITS,
)

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data"
ARTIFACTS_DIR = BASE_DIR / "telemetry" / "ml" / "artifacts"

TRAIN_FILE = DATA_DIR / "clean_telemetry.csv"
TEST_FILE = DATA_DIR / "injected_telemetry.csv"

def extract_root_causes(dataframe, features, baseline_df):
    anomaly_indices = dataframe[dataframe['Flight_Ready_Anomaly'] == 1].index

    if len(anomaly_indices) == 0:
        print("All clear. No anomalies detected to analyse.")
        return

    baseline_mean = baseline_df[features].mean()
    baseline_std = baseline_df[features].std().replace(0, 1e-8)

    for idx in anomaly_indices[:5]:
        row_data = dataframe.loc[idx, features]
        diffs = abs(row_data - baseline_mean) / baseline_std
        top_causes = diffs.sort_values(ascending=False).head(3)

        timestamp = dataframe.loc[idx, 'UTC_Timestamp']
        print(f"\nAlarm at {timestamp}")
        for feature_name, score in top_causes.items():
            print(f"   {feature_name}: z-score distance = {score:.2f}")

def main():
    train_df = pd.read_csv(TRAIN_FILE)
    test_df = pd.read_csv(TEST_FILE)

    for df_name, temp_df in [("TRAIN", train_df), ("TEST", test_df)]:
        temp_df = parse_datetime_column(temp_df)
        if df_name == "TRAIN":
            train_df = temp_df
        else:
            test_df = temp_df
        print(f"{df_name} dataset shape: {temp_df.shape}")

    print("\nTest Ground Truth distribution:")
    print(test_df['Ground_Truth'].value_counts(dropna=False))
    print("True contamination in test set:", test_df['Ground_Truth'].mean())

    imputer = SimpleImputer(strategy="mean")
    scaler = StandardScaler()

    train_df = engineer_features(train_df)
    test_df = engineer_features(test_df)

    X_train_raw = train_df[advanced_features].copy()
    X_test_raw = test_df[advanced_features].copy()

    X_train_imputed = imputer.fit_transform(X_train_raw)
    X_test_imputed = imputer.transform(X_test_raw)

    X_train_scaled = scaler.fit_transform(X_train_imputed)
    X_test_scaled = scaler.transform(X_test_imputed)

    print("\n--- ABLATION STUDY ---")
    baseline_model = IsolationForest(
        n_estimators=100,
        contamination=test_df['Ground_Truth'].mean(),
        random_state=42
    )

    X_train_raw_base = train_df[selected_features].copy()
    X_test_raw_base = test_df[selected_features].copy()

    raw_imputer = SimpleImputer(strategy="mean")
    raw_scaler = StandardScaler()

    X_train_raw_base = raw_imputer.fit_transform(X_train_raw_base)
    X_test_raw_base = raw_imputer.transform(X_test_raw_base)

    X_train_raw_base = raw_scaler.fit_transform(X_train_raw_base)
    X_test_raw_base = raw_scaler.transform(X_test_raw_base)

    baseline_model.fit(X_train_raw_base)
    preds_raw = (baseline_model.predict(X_test_raw_base) == -1).astype(int)
    f1_raw = f1_score(test_df['Ground_Truth'], preds_raw)

    baseline_model.fit(X_train_scaled)
    preds_eng = (baseline_model.predict(X_test_scaled) == -1).astype(int)
    f1_eng = f1_score(test_df['Ground_Truth'], preds_eng)

    print(f"F1 Score (Raw Features): {f1_raw:.4f}")
    print(f"F1 Score (Engineered):   {f1_eng:.4f}")

    print("\n--- TUNE THE ISOLATION FOREST ---")
    trees_to_test = [50, 100, 200]
    true_contamination = test_df['Ground_Truth'].mean()

    contamination_to_test = sorted(set([
        0.01,
        0.02,
        0.03,
        round(true_contamination, 4),
        round(min(0.10, true_contamination * 1.5), 4)
    ]))

    best_score = -1
    best_params = {}

    for n in trees_to_test:
        for c in contamination_to_test:
            model = IsolationForest(
                n_estimators=n,
                contamination=c,
                random_state=42
            )

            model.fit(X_train_scaled)
            labels = model.predict(X_test_scaled)
            binary_preds = (labels == -1).astype(int)

            score = f1_score(test_df['Ground_Truth'], binary_preds)

            print(f"Testing n_estimators: {n}, contamination: {c:.5f} | F1 score: {score:.5f}")

            if score > best_score:
                best_score = score
                best_params = {"n_estimators": n, "contamination": c}

    print(f"\nBest Forest: {best_params['n_estimators']} trees, contamination={best_params['contamination']:.5f}, F1={best_score:.5f}")

    final_model_if = IsolationForest(
        n_estimators=best_params['n_estimators'],
        contamination=best_params['contamination'],
        random_state=42
    )
    final_model_if.fit(X_train_scaled)

    print("\n--- TUNE LOF/SVM & WEIGHTED ENSEMBLE VOTING ---")

    test_df['Vote_IF'] = (final_model_if.predict(X_test_scaled) == -1).astype(int)

    best_lof_f1 = -1
    best_lof_k = 20
    for k in [10, 20, 50]:
        model = LocalOutlierFactor(n_neighbors=k, contamination=best_params['contamination'], novelty=True)
        model.fit(X_train_scaled)
        preds = (model.predict(X_test_scaled) == -1).astype(int)
        score = f1_score(test_df['Ground_Truth'], preds, zero_division=0)
        if score > best_lof_f1:
            best_lof_f1 = score
            best_lof_k = k

    print(f"Best LOF: {best_lof_k} neighbours (F1: {best_lof_f1:.4f})")
    final_model_lof = LocalOutlierFactor(
        n_neighbors=best_lof_k,
        contamination=best_params['contamination'],
        novelty=True
    )
    final_model_lof.fit(X_train_scaled)
    test_df['Vote_LOF'] = (final_model_lof.predict(X_test_scaled) == -1).astype(int)

    best_svm_f1 = -1
    best_svm_gamma = 'scale'
    for g in ['scale', 'auto', 0.01, 0.1]:
        model = OneClassSVM(nu=best_params['contamination'], kernel="rbf", gamma=g)
        model.fit(X_train_scaled)
        preds = (model.predict(X_test_scaled) == -1).astype(int)
        score = f1_score(test_df['Ground_Truth'], preds, zero_division=0)
        if score > best_svm_f1:
            best_svm_f1 = score
            best_svm_gamma = g

    print(f"Best SVM: gamma={best_svm_gamma} (F1: {best_svm_f1:.4f})")
    final_model_svm = OneClassSVM(
        nu=best_params['contamination'],
        kernel="rbf",
        gamma=best_svm_gamma
    )
    final_model_svm.fit(X_train_scaled)
    test_df['Vote_SVM'] = (final_model_svm.predict(X_test_scaled) == -1).astype(int)

    test_df['Weighted_Votes'] = (
        test_df['Vote_IF'] * WEIGHT_IF +
        test_df['Vote_LOF'] * WEIGHT_LOF +
        test_df['Vote_SVM'] * WEIGHT_SVM
    )

    test_df['Final_Anomaly'] = (test_df['Weighted_Votes'] >= VOTE_THRESHOLD).astype(int)

    print("\n--- PER-MODEL DIAGNOSTICS ---")
    for col in ['Vote_IF', 'Vote_LOF', 'Vote_SVM', 'Final_Anomaly']:
        flagged = test_df[col].sum()
        f1 = f1_score(test_df['Ground_Truth'], test_df[col], zero_division=0)
        print(f"{col}: flagged={flagged}, F1={f1:.4f}")

    print("\n--- DEBOUNCER ---")
    test_df['Debounced_Alarm'] = test_df['Final_Anomaly'].rolling(window=DEBOUNCE_WINDOW, min_periods=1).sum()
    test_df['Flight_Ready_Anomaly'] = (test_df['Debounced_Alarm'] >= DEBOUNCE_HITS).astype(int)

    print(f"Raw Anomalies (Committee):          {test_df['Final_Anomaly'].sum()}")
    print(f"Flight-Ready Anomalies (Debounced): {test_df['Flight_Ready_Anomaly'].sum()}")

    print("\n--- AI PERFORMANCE REPORT ---")
    y_true = test_df['Ground_Truth']
    y_pred_raw = test_df['Final_Anomaly']
    y_pred_debounced = test_df['Flight_Ready_Anomaly']

    f1_raw_committee = f1_score(y_true, y_pred_raw)
    f1_debounced = f1_score(y_true, y_pred_debounced)

    print(f"F1-Score (Raw Committee):   {f1_raw_committee:.4f}")
    print(f"F1-Score (Debounced):       {f1_debounced:.4f}")

    test_df['IF_Anomaly_Score'] = -final_model_if.decision_function(X_test_scaled)
    roc_auc = roc_auc_score(y_true, test_df['IF_Anomaly_Score'])
    print(f"ROC-AUC (Isolation Forest Score): {roc_auc:.4f}")

    cm = confusion_matrix(y_true, y_pred_debounced)
    print("\nConfusion Matrix:")
    print(f"True Negatives  (Normal ignored correctly): {cm[0][0]}")
    print(f"False Positives (False alarms):             {cm[0][1]}")
    print(f"False Negatives (Missed anomalies):         {cm[1][0]}")
    print(f"True Positives  (Anomalies caught):         {cm[1][1]}\n")

    print("\n--- PERFORMANCE BY ANOMALY TYPE ---")
    for anomaly_type in test_df['Anomaly_Type'].unique():
        if anomaly_type == "Normal":
            continue

        subset = test_df[test_df['Anomaly_Type'].isin(["Normal", anomaly_type])].copy()
        y_true_subset = subset['Ground_Truth']
        y_pred_subset = subset['Flight_Ready_Anomaly']

        f1_subset = f1_score(y_true_subset, y_pred_subset, zero_division=0)
        precision_subset = precision_score(y_true_subset, y_pred_subset, zero_division=0)
        recall_subset = recall_score(y_true_subset, y_pred_subset, zero_division=0)

        print(f"{anomaly_type}:")
        print(f"   F1:        {f1_subset:.4f}")
        print(f"   Precision: {precision_subset:.4f}")
        print(f"   Recall:    {recall_subset:.4f}")

    print("\n--- ROOT CAUSE ANALYSIS ---")
    extract_root_causes(test_df, advanced_features, train_df)

    export_path = DATA_DIR / "STAR_Pulse_Graded_Telemetry.csv"
    test_df.to_csv(export_path, index=False)
    print(f"Saved graded telemetry to {export_path}")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(imputer, ARTIFACTS_DIR / "imputer.joblib")
    joblib.dump(scaler, ARTIFACTS_DIR / "scaler.joblib")
    joblib.dump(final_model_if, ARTIFACTS_DIR / "if_model.joblib")
    joblib.dump(final_model_lof, ARTIFACTS_DIR / "lof_model.joblib")
    joblib.dump(final_model_svm, ARTIFACTS_DIR / "svm_model.joblib")

    # The ONLY addition to the original main()
    total_predictions = np.sum(cm)
    accuracy = (cm[0][0] + cm[1][1]) / total_predictions if total_predictions > 0 else 0
    metrics = {
        "f1_score": float(round(f1_debounced, 4)),
        "accuracy": float(round(accuracy * 100, 1)),
        "confusion_matrix": {
            "tn": int(cm[0][0]), "fp": int(cm[0][1]),
            "fn": int(cm[1][0]), "tp": int(cm[1][1])
        }
    }
    with open(ARTIFACTS_DIR / "training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)

    print(f"Saved artefacts to {ARTIFACTS_DIR}")

if __name__ == "__main__":
    main()