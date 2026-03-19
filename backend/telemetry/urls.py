from django.urls import path
from .views import TelemetryListView, upload_telemetry

urlpatterns = [
    # Your existing list view
    path('telemetry/', TelemetryListView.as_view(), name='telemetry-list'),
    
    # NEW: The ML upload endpoint (Make sure this line is here!)
    path('telemetry/upload/', upload_telemetry, name='telemetry-upload'),
]