from django.db import models
from django.contrib.auth.models import User
import json

class UserSession(models.Model):
    # Records every login event for audit purposes — IP address stored for traceability
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    login_time = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.login_time}"


class TelemetryUpload(models.Model):
    # One record per file upload — stores both the original file and the ML results as JSON
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploads')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # Physical file saved to backend/media/telemetry/YYYY/MM/
    datafile = models.FileField(upload_to='telemetry/%Y/%m/', null=True, blank=True)
    # Summary stats: total_rows, anomaly count, latency, throughput
    summary = models.JSONField()
    # Only the flagged rows — used by the Anomalies page
    anomalies_json = models.JSONField()
    # First 150 rows — used by the time-series charts on the Dashboard
    timeseries_json = models.JSONField()

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.username} — {self.filename} ({self.uploaded_at:%Y-%m-%d %H:%M})"


class TelemetryRecord(models.Model):
    # One row per sensor channel per timestamp — 10 channels × N rows per upload
    # Linked to TelemetryUpload so records are deleted when the upload is deleted
    upload = models.ForeignKey(TelemetryUpload, on_delete=models.CASCADE, null=True, blank=True, related_name='records')
    timestamp = models.DateTimeField()
    channel_id = models.CharField(max_length=50)   # e.g. EPS_VOLT_01
    label = models.CharField(max_length=100)        # e.g. Battery Voltage
    value = models.FloatField()
    subsystem = models.CharField(max_length=50, default="Unknown")  # Power / Thermal / Attitude
    is_anomaly = models.BooleanField(default=False)
    anomaly_score = models.FloatField(null=True, blank=True)  # raw IF decision function value

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.label}: {self.value} ({self.timestamp})"


class BenchmarkResult(models.Model):
    # Stores supervised evaluation metrics computed when a labelled benchmark file is uploaded
    # auc_roc is nullable because it cannot be computed if only one class is present in y_true
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='benchmarks')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    total_rows = models.IntegerField()
    anomaly_count = models.IntegerField()
    f1_score = models.FloatField()
    precision = models.FloatField()
    recall = models.FloatField()
    accuracy = models.FloatField()
    auc_roc = models.FloatField(null=True, blank=True)
    confusion_matrix = models.JSONField()  # stored as [[TN, FP], [FN, TP]]

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.username} — {self.filename} F1={self.f1_score:.3f}"
