import os
import django
import pandas as pd
from sklearn.ensemble import IsolationForest

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from telemetry.models import TelemetryRecord

def process_esa_pickle_data(mission_num=1):
    # Standard testing channels for the ESA benchmark
    target_channels = ['41', '42', '43', '44']
    
    # Mapping for your Dashboard labels
    mapping = {
        '41': {'label': 'EPS_VOLT_01', 'sub': 'Power'},
        '42': {'label': 'EPS_CURR_01', 'sub': 'Power'},
        '43': {'label': 'TCS_TEMP_01', 'sub': 'Thermal'},
        '44': {'label': 'AOCS_GYRO_X', 'sub': 'Attitude'}
    }

    records = []

    for ch_id in target_channels:
        # This matches the structure we just created
        file_path = f'data/channel_{ch_id}' 
        
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        # Load the pickle file
        df = pd.read_pickle(file_path)
        
        # 2. Run Isolation Forest on this specific channel
        # We reshaped it because it's a single column
        model = IsolationForest(contamination=0.03) 
        df['anomaly_res'] = model.fit_predict(df.values.reshape(-1, 1))

        # 3. Prepare first 50 data points for the dashboard
        for timestamp, row in df.head(50).iterrows():
            records.append(TelemetryRecord(
                timestamp=timestamp, 
                channel_id=f"CH_{ch_id}",
                label=mapping[ch_id]['label'],
                subsystem=mapping[ch_id]['sub'],
                value=row[0], # The first column in the pickle is the value
                is_anomaly=True if row['anomaly_res'] == -1 else False
            ))

    # 4. Save to Database
    TelemetryRecord.objects.bulk_create(records)
    print(f"Successfully ingested {len(records)} records from Pickle files.")

if __name__ == "__main__":
    process_esa_pickle_data(mission_num=1)