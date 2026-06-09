from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from allauth.account.models import EmailAddress


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
        self.assertFalse(response.data['is_staff'])
        self.assertFalse(response.data['is_superuser'])

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
        self.assertIn('is_staff', response.data)
        self.assertIn('is_superuser', response.data)


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


class AdminUserViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@email.com",
            password="adminpass123",
        )
        self.user = get_user_model().objects.create_user(
            username="regular",
            email="regular@email.com",
            password="userpass123",
        )
        EmailAddress.objects.create(
            user=self.user,
            email="regular@email.com",
            verified=False,
            primary=True,
        )

    def authenticate(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

    def test_admin_can_list_users(self):
        self.authenticate(self.admin)

        response = self.client.get("/api/v1/admin/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [user["username"] for user in response.data]
        self.assertIn("admin", usernames)
        self.assertIn("regular", usernames)
        regular = next(user for user in response.data if user["username"] == "regular")
        self.assertEqual(
            regular["verified_emails"],
            [{"email": "regular@email.com", "verified": False}],
        )

    def test_non_staff_user_cannot_list_users(self):
        self.authenticate(self.user)

        response = self.client.get("/api/v1/admin/users/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_another_user(self):
        self.authenticate(self.admin)
        user_id = self.user.pk

        response = self.client.delete(f"/api/v1/admin/users/{user_id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(get_user_model().objects.filter(pk=user_id).exists())
        self.assertFalse(EmailAddress.objects.filter(user_id=user_id).exists())

    def test_admin_cannot_delete_self(self):
        self.authenticate(self.admin)

        response = self.client.delete(f"/api/v1/admin/users/{self.admin.pk}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(get_user_model().objects.filter(pk=self.admin.pk).exists())

    def test_non_staff_user_cannot_delete_user(self):
        self.authenticate(self.user)

        response = self.client.delete(f"/api/v1/admin/users/{self.admin.pk}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(get_user_model().objects.filter(pk=self.admin.pk).exists())
