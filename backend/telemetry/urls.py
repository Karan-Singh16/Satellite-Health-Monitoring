from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('satellite/', views.get_satellite_location, name='satellite-location'),
    path('telemetry/list/', views.TelemetryListView.as_view(), name='telemetry-list'),
    path('telemetry/upload/', views.upload_telemetry, name='upload-telemetry'),
    path('telemetry/history/', views.upload_history, name='upload-history'),
    path('telemetry/history/<int:pk>/', views.upload_history_detail, name='upload-history-detail'),

    # NEW METRICS ENDPOINT
    path('metrics/', views.get_training_metrics, name='training-metrics'),

    # BENCHMARK / EVALUATION
    path('telemetry/benchmark/', views.upload_benchmark, name='upload-benchmark'),
    path('telemetry/benchmark/latest/', views.get_latest_benchmark, name='latest-benchmark'),
]