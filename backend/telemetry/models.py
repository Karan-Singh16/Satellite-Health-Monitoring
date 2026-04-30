from django.db import models
from django.contrib.auth.models import User
import json

class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    login_time = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.login_time}"

class TelemetryRecord(models.Model):
    upload = models.ForeignKey('TelemetryUpload', on_delete=models.CASCADE, null=True, blank=True, related_name='records')
    timestamp = models.DateTimeField()
    channel_id = models.CharField(max_length=50)
    label = models.CharField(max_length=100)
    value = models.FloatField()
    subsystem = models.CharField(max_length=50, default="Unknown")
    is_anomaly = models.BooleanField(default=False)
    anomaly_score = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.label}: {self.value} ({self.timestamp})"


class TelemetryUpload(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploads')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    datafile = models.FileField(upload_to='telemetry/%Y/%m/', null=True, blank=True)
    summary = models.JSONField()
    anomalies_json = models.JSONField()
    timeseries_json = models.JSONField()

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.username} — {self.filename} ({self.uploaded_at:%Y-%m-%d %H:%M})"


class BenchmarkResult(models.Model):
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
    confusion_matrix = models.JSONField()

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.username} — {self.filename} F1={self.f1_score:.3f}"