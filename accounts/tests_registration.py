from unittest.mock import patch

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()
REGISTER_URL = "/api/v1/dj-rest-auth/registration/"


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://theshed.test",
)
class RegistrationEmailFailureTests(APITestCase):
    def _post_registration(self, username="newuser", email="new@example.com"):
        return self.client.post(
            REGISTER_URL,
            {
                "username": username,
                "email": email,
                "password1": "StrongPass123!",
                "password2": "StrongPass123!",
            },
            format="json",
            secure=True,
            HTTP_HOST="localhost",
        )

    def test_successful_registration_still_creates_pending_user(self):
        response = self._post_registration()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())
        self.assertTrue(
            EmailAddress.objects.filter(email="new@example.com", verified=False).exists()
        )

    def test_email_failure_rolls_back_user_creation(self):
        with patch(
            "allauth.account.adapter.DefaultAccountAdapter.send_mail",
            side_effect=OSError("simulated email outage"),
        ):
            response = self._post_registration()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(
            response.data["detail"],
            "We couldn't send the verification email, so no account was created. Please try again in a moment.",
        )
        self.assertFalse(User.objects.filter(username="newuser").exists())
        self.assertFalse(EmailAddress.objects.filter(email="new@example.com").exists())

    def test_email_failure_does_not_block_retry_with_same_username(self):
        with patch(
            "allauth.account.adapter.DefaultAccountAdapter.send_mail",
            side_effect=OSError("simulated email outage"),
        ):
            first = self._post_registration()
            second = self._post_registration()

        self.assertEqual(first.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(second.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(User.objects.filter(username="newuser").exists())
        self.assertFalse(EmailAddress.objects.filter(email="new@example.com").exists())
