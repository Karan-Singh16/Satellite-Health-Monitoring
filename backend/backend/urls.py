from django.contrib import admin
from django.urls import path
# Look closely at this import line!
from telemetry.views import health, TelemetryListView, get_satellite_location 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/telemetry/', TelemetryListView.as_view(), name='telemetry-list'),
    
    # This is the line your screenshot says is missing:
    path('api/satellite/', get_satellite_location),
]