from django.urls import path
from .views import TelemetryListView

urlpatterns = [
    # This makes the URL: /api/telemetry/
    path('telemetry/', TelemetryListView.as_view(), name='telemetry-list'),
]