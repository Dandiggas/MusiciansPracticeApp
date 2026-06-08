from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from allauth.account.models import EmailAddress


class PasswordChangeTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="player",
            email="player@example.com",
            password="old-password-123",
        )
        EmailAddress.objects.create(
            user=self.user,
            email=self.user.email,
            verified=True,
            primary=True,
        )
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_password_change_requires_current_password(self):
        response = self.client.post(
            "/api/v1/dj-rest-auth/password/change/",
            {
                "new_password1": "new-password-123",
                "new_password2": "new-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("old_password", response.data)

    def test_password_change_rejects_wrong_current_password(self):
        response = self.client.post(
            "/api/v1/dj-rest-auth/password/change/",
            {
                "old_password": "wrong-password",
                "new_password1": "new-password-123",
                "new_password2": "new-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("old_password", response.data)

    def test_password_change_updates_password(self):
        response = self.client.post(
            "/api/v1/dj-rest-auth/password/change/",
            {
                "old_password": "old-password-123",
                "new_password1": "new-password-123",
                "new_password2": "new-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-password-123"))
