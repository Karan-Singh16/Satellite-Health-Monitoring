from django.db import models

class TelemetryRecord(models.Model):
    # Time the satellite recorded the data
    timestamp = models.DateTimeField()
    
    # The raw name from the ESA dataset (e.g., 'channel_41')
    channel_id = models.CharField(max_length=50)
    
    # Your human-readable label (e.g., 'Battery_Voltage')
    label = models.CharField(max_length=100)
    
    # The actual numerical value
    value = models.FloatField()
    
    # Subsystem grouping (Power, Thermal, etc.)
    subsystem = models.CharField(max_length=50, default="Unknown")
    
    # ML Results
    is_anomaly = models.BooleanField(default=False)
    anomaly_score = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.label}: {self.value} ({self.timestamp})"