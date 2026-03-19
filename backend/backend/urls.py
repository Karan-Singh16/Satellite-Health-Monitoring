from django.contrib import admin
from django.urls import path

# Notice we added upload_telemetry to this import list!
from telemetry.views import health, TelemetryListView, get_satellite_location, upload_telemetry 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    
    # Your existing telemetry list
    path('api/telemetry/', TelemetryListView.as_view(), name='telemetry-list'),
    
    # 🚀 NEW: The ML upload endpoint added to the Main Boss router!
    path('api/telemetry/upload/', upload_telemetry, name='telemetry-upload'),
    
    path('api/satellite/', get_satellite_location),
]