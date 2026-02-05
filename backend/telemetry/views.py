from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import TelemetryRecord
from .serializers import TelemetrySerializer
import requests
from django.http import JsonResponse

def get_satellite_location(request):
    # NORAD ID 25544 is the ISS - great for testing!
    # Replace 'YOUR_API_KEY' with your key from n2yo.com
    api_key = "ZDAWVF-BB7EED-92BJJQ-5NGQ"
    url = f"https://api.n2yo.com/rest/v1/satellite/positions/25544/0/0/0/3000/&apiKey={api_key}"
    
    try:
        response = requests.get(url)
        return JsonResponse(response.json())
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# Data for Home and Telemetry pages
class TelemetryListView(generics.ListAPIView):
    queryset = TelemetryRecord.objects.all()[:200] # Return latest 200 rows
    serializer_class = TelemetrySerializer

@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "satellite-backend"})