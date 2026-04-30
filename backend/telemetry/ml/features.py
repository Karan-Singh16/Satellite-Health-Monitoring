import numpy as np
import pandas as pd

# Updated to match Improved ml model.ipynb
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

# These are the ones used for the Global Model (Model 1)
global_features = selected_features

def parse_datetime_column(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Handle the specific format in telemetry.xlsx: '16:43:55 - 28/04/2020'
    df['Datetime'] = pd.to_datetime(
        df['UTC_Timestamp'],
        format='%H:%M:%S - %d/%m/%Y',
        errors='coerce'
    )
    df.sort_values('Datetime', inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df

def engineer_feature_specific(df: pd.DataFrame, feature: str) -> pd.DataFrame:
    """
    Engineers temporal features for a single base feature as per Model 2 in the notebook.
    """
    temp_df = pd.DataFrame()
    temp_df['raw'] = df[feature]
    temp_df['diff'] = df[feature].diff().fillna(0)

    # Rolling stats use a shift(1) in the notebook to prevent data leakage
    temp_df['roll_mean'] = df[feature].shift(1).rolling(window=10, min_periods=3).mean()
    temp_df['roll_std'] = df[feature].shift(1).rolling(window=10, min_periods=3).std().fillna(0)

    short_roll = df[feature].shift(1).rolling(window=10, min_periods=3).mean()
    long_roll = df[feature].shift(1).rolling(window=50, min_periods=10).mean()
    temp_df['drift'] = short_roll - long_roll

    # Fill NAs caused by rolling windows
    temp_df = temp_df.fillna(0)
    return temp_df