from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

class HealthEndpointTests(APITestCase):
    
    def setUp(self):
        # setUp runs before every single test. 
        # We define the URL here so we don't have to repeat it.
        self.url = reverse('health')

    def test_health_check_get_success(self):
        """
        [Happy Path] Ensure the health endpoint returns a 200 OK 
        and the correct JSON payload on a valid GET request.
        """
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"status": "ok", "service": "satellite-backend"})

    def test_health_check_post_method_not_allowed(self):
        """
        [Sad Path] Ensure the health endpoint rejects POST requests 
        with a 405 Method Not Allowed.
        """
        response = self.client.post(self.url, data={"test": "data"})
        
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_health_check_put_method_not_allowed(self):
        """
        [Sad Path] Ensure the health endpoint rejects PUT requests 
        with a 405 Method Not Allowed.
        """
        response = self.client.put(self.url, data={"test": "data"})
        
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_health_check_delete_method_not_allowed(self):
        """
        [Sad Path] Ensure the health endpoint rejects DELETE requests 
        with a 405 Method Not Allowed.
        """
        response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)