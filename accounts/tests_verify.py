from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from allauth.account.models import EmailAddress, EmailConfirmation, EmailConfirmationHMAC
from accounts.models import CustomUser


VERIFY_URL = "/api/v1/dj-rest-auth/registration/verify-and-login/"


def _make_unverified_user_with_hmac():
    user = CustomUser.objects.create_user(
        username="new", email="new@example.com", password="x"
    )
    email = EmailAddress.objects.create(
        user=user, email="new@example.com", verified=False, primary=True
    )
    hmac = EmailConfirmationHMAC(email)
    return user, email, hmac.key


class VerifyAndLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_happy_path_confirms_email_and_returns_token(self):
        user, email, key = _make_unverified_user_with_hmac()
        resp = self.client.post(VERIFY_URL, {"key": key}, format="json")
        self.assertEqual(resp.status_code, 200)

        body = resp.json()
        self.assertIn("key", body)
        self.assertEqual(body["user"], user.pk)

        email.refresh_from_db()
        self.assertTrue(email.verified)

        token = Token.objects.get(user=user)
        self.assertEqual(body["key"], token.key)

    def test_invalid_key_returns_404(self):
        resp = self.client.post(VERIFY_URL, {"key": "definitely-not-a-key"}, format="json")
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["detail"], "invalid_key")

    def test_missing_key_returns_404(self):
        resp = self.client.post(VERIFY_URL, {}, format="json")
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["detail"], "invalid_key")

    def test_already_verified_returns_409(self):
        user, email, key = _make_unverified_user_with_hmac()
        email.verified = True
        email.save()

        resp = self.client.post(VERIFY_URL, {"key": key}, format="json")
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()["detail"], "already_verified")

    def test_expired_key_returns_410(self):
        user, email, _ = _make_unverified_user_with_hmac()
        # DB-stored path: row with sent older than expiry.
        # Use the adapter to generate a proper key (objects.create() without key= leaves it empty).
        from allauth.account.adapter import get_adapter
        db_key = get_adapter().generate_emailconfirmation_key(email.email)
        confirmation = EmailConfirmation.objects.create(
            email_address=email,
            sent=timezone.now() - timedelta(days=7),
            key=db_key,
        )
        # Force the DB-stored key path (not HMAC) by POSTing the stored row's key.
        resp = self.client.post(VERIFY_URL, {"key": confirmation.key}, format="json")
        self.assertEqual(resp.status_code, 410)
        self.assertEqual(resp.json()["detail"], "expired_key")

    def test_reuses_existing_token_if_present(self):
        user, email, key = _make_unverified_user_with_hmac()
        existing_token = Token.objects.create(user=user)

        resp = self.client.post(VERIFY_URL, {"key": key}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["key"], existing_token.key)

    def test_endpoint_is_public_no_auth_required(self):
        user, email, key = _make_unverified_user_with_hmac()
        # No credentials on client — endpoint must be AllowAny.
        resp = self.client.post(VERIFY_URL, {"key": key}, format="json")
        self.assertEqual(resp.status_code, 200)

    def test_expired_hmac_key_returns_410(self):
        """Production path — allauth 65.x defaults to HMAC keys, so this is
        the expiry code path real users will hit. Simulates an expired
        HMAC by patching the clock signing.loads() reads."""
        from unittest.mock import patch
        import time

        user, email, key = _make_unverified_user_with_hmac()

        # Jump 8 days forward (past ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS=1)
        # so signing.loads raises SignatureExpired.
        future = time.time() + 8 * 86400

        with patch("django.core.signing.time.time", return_value=future):
            resp = self.client.post(VERIFY_URL, {"key": key}, format="json")

        self.assertEqual(resp.status_code, 410)
        self.assertEqual(resp.json()["detail"], "expired_key")
        # Sanity: email is still unverified — expired keys don't confirm.
        email.refresh_from_db()
        self.assertFalse(email.verified)
