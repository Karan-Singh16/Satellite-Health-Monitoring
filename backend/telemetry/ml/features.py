import numpy as np
import pandas as pd

# The 10 sensor channels used by both Model 1 (global) and Model 2 (feature-specific)
# Selected from the Quetzal-1 dataset based on coverage across EPS, ADCS, and TCS subsystems
selected_features = [
    "battery_voltage",
    "average_current",
    "average_power",
    "remaining_capacity",
    "gyro_X",
    "gyro_Y",
    "gyro_Z",
    "EPS_temperature",
    "ADCS_temperature1",
    "BNO055_temperature"
]

# Human-readable labels for reports and visualisations
feature_dict = {
    "battery_voltage": "Battery Voltage (V)",
    "average_current": "Average Current (mA)",
    "average_power": "Average Power (W)",
    "remaining_capacity": "Remaining Capacity (mAh)",
    "gyro_X": "Gyroscope X (°/s)",
    "gyro_Y": "Gyroscope Y (°/s)",
    "gyro_Z": "Gyroscope Z (°/s)",
    "EPS_temperature": "EPS Temperature (°C)",
    "ADCS_temperature1": "ADCS Temperature 1 (°C)",
    "BNO055_temperature": "BNO055 Temperature (°C)"
}

global_features = selected_features

def parse_datetime_column(df: pd.DataFrame) -> pd.DataFrame:
    # Converts the Quetzal-1 timestamp format ('16:43:55 - 28/04/2020') into a sortable Datetime column
    df = df.copy()
    df['Datetime'] = pd.to_datetime(
        df['UTC_Timestamp'],
        format='%H:%M:%S - %d/%m/%Y',
        errors='coerce'  # invalid rows become NaT rather than crashing
    )
    df.sort_values('Datetime', inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df

def engineer_feature_specific(df: pd.DataFrame, feature: str) -> pd.DataFrame:
    """
    Builds 5 temporal features for a single sensor channel.
    These capture rate-of-change, short-term noise, and long-term drift —
    patterns that raw values alone would miss.
    """
    temp_df = pd.DataFrame()

    # Raw value — the baseline signal
    temp_df['raw'] = df[feature]

    # First-order difference — detects sudden spikes or drops between readings
    temp_df['diff'] = df[feature].diff().fillna(0)

    # shift(1) applied before rolling to prevent data leakage from the current timestep
    temp_df['roll_mean'] = df[feature].shift(1).rolling(window=10, min_periods=3).mean()
    temp_df['roll_std']  = df[feature].shift(1).rolling(window=10, min_periods=3).std().fillna(0)

    # Drift: difference between short-term (10pt) and long-term (50pt) rolling mean
    # A growing gap here indicates the sensor is slowly diverging from its baseline
    short_roll = df[feature].shift(1).rolling(window=10, min_periods=3).mean()
    long_roll  = df[feature].shift(1).rolling(window=50, min_periods=10).mean()
    temp_df['drift'] = short_roll - long_roll

    # Replace any remaining NaNs from rolling window edges with 0
    temp_df = temp_df.fillna(0)
    return temp_df
