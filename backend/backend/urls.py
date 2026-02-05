from django.contrib import admin
from django.urls import path
from telemetry.views import health, TelemetryListView, get_satellite_location 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/telemetry/', TelemetryListView.as_view(), name='telemetry-list'),
    
    path('api/satellite/', get_satellite_location),
]