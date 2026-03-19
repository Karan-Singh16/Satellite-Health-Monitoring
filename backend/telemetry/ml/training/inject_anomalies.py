from pathlib import Path
import numpy as np
import pandas as pd

from telemetry.ml.features import parse_datetime_column

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data"

SOURCE_FILE = DATA_DIR / "telemetry.xlsx"
CLEAN_OUT = DATA_DIR / "clean_telemetry.csv"
INJECTED_OUT = DATA_DIR / "injected_telemetry.csv"

def inject_synthetic_anomalies(clean_df: pd.DataFrame) -> pd.DataFrame:
    df_test = clean_df.copy()
    df_test['Ground_Truth'] = 0
    df_test['Anomaly_Type'] = "Normal"

    total_rows = len(df_test)

    def safe_window(start_ratio, length):
        start = int(total_rows * start_ratio)
        end = min(start + length, total_rows)
        return start, end

    start_1, end_1 = safe_window(0.15, 150)
    df_test.loc[start_1:end_1-1, 'battery_voltage'] *= 0.15
    df_test.loc[start_1:end_1-1, 'average_power'] *= 0.20
    df_test.loc[start_1:end_1-1, 'remaining_capacity'] *= 0.30
    df_test.loc[start_1:end_1-1, 'Ground_Truth'] = 1
    df_test.loc[start_1:end_1-1, 'Anomaly_Type'] = "Battery Failure"

    start_2, end_2 = safe_window(0.35, 200)
    df_test.loc[start_2:end_2-1, 'gyro_X'] *= 25
    df_test.loc[start_2:end_2-1, 'gyro_Y'] *= -25
    df_test.loc[start_2:end_2-1, 'gyro_Z'] *= 20
    df_test.loc[start_2:end_2-1, 'mag_X'] *= 3
    df_test.loc[start_2:end_2-1, 'mag_Y'] *= -3
    df_test.loc[start_2:end_2-1, 'Ground_Truth'] = 1
    df_test.loc[start_2:end_2-1, 'Anomaly_Type'] = "Tumbling Event"

    start_3, end_3 = safe_window(0.55, 250)
    thermal_drift = np.linspace(0, 45, end_3 - start_3)
    df_test.loc[start_3:end_3-1, 'EPS_temperature'] += thermal_drift
    df_test.loc[start_3:end_3-1, 'ADCS_temperature1'] += thermal_drift * 0.7
    df_test.loc[start_3:end_3-1, 'BNO055_temperature'] += thermal_drift * 0.5
    df_test.loc[start_3:end_3-1, 'Ground_Truth'] = 1
    df_test.loc[start_3:end_3-1, 'Anomaly_Type'] = "Thermal Runaway"

    start_4, end_4 = safe_window(0.72, 180)
    rng = np.random.default_rng(42)
    df_test.loc[start_4:end_4-1, 'altitude'] += rng.normal(0, 800, end_4 - start_4)
    df_test.loc[start_4:end_4-1, 'latitude'] += rng.normal(0, 2.5, end_4 - start_4)
    df_test.loc[start_4:end_4-1, 'longitude'] += rng.normal(0, 2.5, end_4 - start_4)
    df_test.loc[start_4:end_4-1, 'Ground_Truth'] = 1
    df_test.loc[start_4:end_4-1, 'Anomaly_Type'] = "Sensor Noise"

    start_5, end_5 = safe_window(0.88, 120)
    df_test.loc[start_5:end_5-1, 'average_current'] *= 4
    df_test.loc[start_5:end_5-1, 'average_power'] *= 0.4
    df_test.loc[start_5:end_5-1, 'battery_voltage'] *= 0.75
    df_test.loc[start_5:end_5-1, 'Ground_Truth'] = 1
    df_test.loc[start_5:end_5-1, 'Anomaly_Type'] = "Power Mismatch"

    return df_test

def main():
    df = pd.read_excel(SOURCE_FILE)
    df = parse_datetime_column(df)

    # 🔧 FIX: ensure numeric columns are float
    for col in df.select_dtypes(include=['int64', 'int32']).columns:
        df[col] = df[col].astype(float)

    df.to_csv(CLEAN_OUT, index=False)

    injected = inject_synthetic_anomalies(df)
    injected.to_csv(INJECTED_OUT, index=False)

    print(f"Saved clean baseline to {CLEAN_OUT}")
    print(f"Saved injected telemetry to {INJECTED_OUT}")

if __name__ == "__main__":
    main()