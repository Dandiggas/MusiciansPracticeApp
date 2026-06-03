import os
from unittest.mock import MagicMock, patch
from django.test import RequestFactory
from django.test import TestCase
from accounts.adapter import CustomAccountAdapter


class CustomAccountAdapterTest(TestCase):
    def test_confirmation_url_uses_frontend_url_env(self):
        confirmation = MagicMock()
        confirmation.key = "abc123"
        adapter = CustomAccountAdapter()

        with patch.dict(os.environ, {"FRONTEND_URL": "https://theshed.app"}):
            url = adapter.get_email_confirmation_url(request=None, emailconfirmation=confirmation)

        self.assertEqual(url, "https://theshed.app/auth/verify/abc123")

    def test_confirmation_url_uses_request_origin_without_env(self):
        confirmation = MagicMock()
        confirmation.key = "origin-key"
        request = RequestFactory().post(
            "/api/v1/dj-rest-auth/registration/",
            HTTP_ORIGIN="https://app.theshed.test",
        )
        adapter = CustomAccountAdapter()
        env_without_frontend = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}

        with patch.dict(os.environ, env_without_frontend, clear=True):
            url = adapter.get_email_confirmation_url(request=request, emailconfirmation=confirmation)

        self.assertEqual(url, "https://app.theshed.test/auth/verify/origin-key")

    def test_confirmation_url_uses_request_referer_without_origin_or_env(self):
        confirmation = MagicMock()
        confirmation.key = "referer-key"
        request = RequestFactory().post(
            "/api/v1/dj-rest-auth/registration/",
            HTTP_REFERER="https://app.theshed.test/register",
        )
        adapter = CustomAccountAdapter()
        env_without_frontend = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}

        with patch.dict(os.environ, env_without_frontend, clear=True):
            url = adapter.get_email_confirmation_url(request=request, emailconfirmation=confirmation)

        self.assertEqual(url, "https://app.theshed.test/auth/verify/referer-key")

    def test_confirmation_url_falls_back_to_localhost_in_dev(self):
        confirmation = MagicMock()
        confirmation.key = "xyz"
        adapter = CustomAccountAdapter()

        # Ensure FRONTEND_URL is unset for this test
        env_without_frontend = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}
        with patch.dict(os.environ, env_without_frontend, clear=True):
            url = adapter.get_email_confirmation_url(request=None, emailconfirmation=confirmation)

        self.assertEqual(url, "http://localhost:3000/auth/verify/xyz")
