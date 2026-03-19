import numpy as np
import pandas as pd

selected_features = [
    "altitude", "latitude", "longitude", "battery_voltage", "average_current",
    "average_power", "remaining_capacity", "mag_X", "mag_Y", "mag_Z",
    "gyro_X", "gyro_Y", "gyro_Z", "EPS_temperature", "ADCS_temperature1",
    "BNO055_temperature"
]

feature_dict = {
    "altitude": "Altitude (m)",
    "latitude": "Latitude (°)",
    "longitude": "Longitude (°)",
    "battery_voltage": "Battery Voltage (V)",
    "average_current": "Average Current (mA)",
    "average_power": "Average Power (W)",
    "remaining_capacity": "Remaining Capacity (mAh)",
    "mag_X": "Magnetometer X (µT)",
    "mag_Y": "Magnetometer Y (µT)",
    "mag_Z": "Magnetometer Z (µT)",
    "gyro_X": "Gyroscope X (°/s)",
    "gyro_Y": "Gyroscope Y (°/s)",
    "gyro_Z": "Gyroscope Z (°/s)",
    "EPS_temperature": "EPS Temperature (°C)",
    "ADCS_temperature1": "ADCS Temperature 1 (°C)",
    "BNO055_temperature": "BNO055 Temperature (°C)",
}

advanced_features = [
    'altitude',
    'latitude',
    'longitude',
    'battery_voltage',
    'average_current',
    'average_power',
    'remaining_capacity',
    'mag_X',
    'mag_Y',
    'mag_Z',
    'gyro_X',
    'gyro_Y',
    'gyro_Z',
    'EPS_temperature',
    'ADCS_temperature1',
    'delta_battery_voltage',
    'delta_EPS_temp',
    'delta_altitude',
    'rolling_std_gyro_X',
    'rolling_std_gyro_Y',
    'rolling_std_gyro_Z',
    'rolling_mean_current',
    'mag_total',
    'gyro_total',
    'power_discrepancy',
    'BNO055_temperature',
]

def parse_datetime_column(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['Datetime'] = pd.to_datetime(
        df['UTC_Timestamp'],
        format='%H:%M:%S - %d/%m/%Y',
        errors='coerce'
    )
    df.sort_values('Datetime', inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df['delta_battery_voltage'] = df['battery_voltage'].diff()
    df['delta_EPS_temp'] = df['EPS_temperature'].diff()
    df['delta_altitude'] = df['altitude'].diff()

    df['rolling_std_gyro_X'] = df['gyro_X'].rolling(window=10, min_periods=1).std()
    df['rolling_std_gyro_Y'] = df['gyro_Y'].rolling(window=10, min_periods=1).std()
    df['rolling_std_gyro_Z'] = df['gyro_Z'].rolling(window=10, min_periods=1).std()
    df['rolling_mean_current'] = df['average_current'].rolling(window=10, min_periods=1).mean()

    df['mag_total'] = np.sqrt(df['mag_X']**2 + df['mag_Y']**2 + df['mag_Z']**2)
    df['gyro_total'] = np.sqrt(df['gyro_X']**2 + df['gyro_Y']**2 + df['gyro_Z']**2)

    df['calculated_power'] = df['battery_voltage'] * (df['average_current'] / 1000.0)
    df['power_discrepancy'] = abs(df['average_power'] - df['calculated_power'])

    return df