from django.urls import path
from telemetry.views import health, TelemetryListView

urlpatterns = [
    path('api/health/', health),
    path('api/telemetry/', TelemetryListView.as_view(), name='telemetry-list'),
]