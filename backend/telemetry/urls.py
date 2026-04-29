from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('location/', views.get_satellite_location, name='satellite-location'),
    path('telemetry/list/', views.TelemetryListView.as_view(), name='telemetry-list'),
    path('telemetry/upload/', views.upload_telemetry, name='upload-telemetry'),
    
    # NEW METRICS ENDPOINT
    path('metrics/', views.get_training_metrics, name='training-metrics'),
]