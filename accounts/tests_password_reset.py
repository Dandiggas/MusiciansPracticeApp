from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase

from allauth.account.forms import default_token_generator
from allauth.account.models import EmailAddress
from allauth.account.utils import user_pk_to_url_str


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://frontend.test",
)
class PasswordResetTests(APITestCase):
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

    def test_password_reset_email_uses_frontend_confirm_url(self):
        response = self.client.post(
            "/api/v1/dj-rest-auth/password/reset/",
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        uid = user_pk_to_url_str(self.user)
        self.assertIn(
            f"https://frontend.test/password-reset/confirm/{uid}/",
            mail.outbox[0].body,
        )

    def test_password_reset_confirm_updates_password(self):
        uid = user_pk_to_url_str(self.user)
        token = default_token_generator.make_token(self.user)

        response = self.client.post(
            "/api/v1/dj-rest-auth/password/reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password1": "new-password-123",
                "new_password2": "new-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-password-123"))
