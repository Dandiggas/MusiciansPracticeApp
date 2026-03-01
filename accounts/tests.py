from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token


class CustomUserModelTests(TestCase):
    """Test cases for the CustomUser model"""

    def test_create_user(self):
        """Test creating a user with custom name field"""
        user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123",
            name="Test User"
        )
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.email, "test@email.com")
        self.assertEqual(user.name, "Test User")
        self.assertTrue(user.check_password("testpass123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_without_name(self):
        """Test that name field is optional"""
        user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.assertIsNone(user.name)

    def test_create_superuser(self):
        """Test creating a superuser"""
        user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@email.com",
            password="adminpass123"
        )
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)


class CurrentUserViewTests(APITestCase):
    """Test cases for current_user_view endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123",
            name="Test User"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_get_current_user(self):
        """Test getting current authenticated user data"""
        response = self.client.get('/api/v1/current-user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@email.com')
        self.assertEqual(response.data['name'], 'Test User')

    def test_get_current_user_unauthenticated(self):
        """Test that unauthenticated users cannot access current user endpoint"""
        self.client.credentials()
        response = self.client.get('/api/v1/current-user/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_current_user_returns_correct_fields(self):
        """Test that serializer returns expected fields"""
        response = self.client.get('/api/v1/current-user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertIn('username', response.data)
        self.assertIn('name', response.data)
        self.assertIn('email', response.data)


class LogoutViewTests(APITestCase):
    """Test cases for logout_view endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_logout_deletes_token(self):
        """Test that logout deletes the auth token"""
        response = self.client.post('/api/v1/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_unauthenticated(self):
        """Test that unauthenticated users cannot logout"""
        self.client.credentials()
        response = self.client.post('/api/v1/logout/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])
