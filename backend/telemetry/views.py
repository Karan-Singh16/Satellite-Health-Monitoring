from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import TelemetryRecord
from .serializers import TelemetrySerializer

# This serves data to your React "Home" and "Telemetry" pages
class TelemetryListView(generics.ListAPIView):
    queryset = TelemetryRecord.objects.all()[:200] # Return latest 200 rows
    serializer_class = TelemetrySerializer

@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "satellite-backend"})