import os
from unittest.mock import MagicMock, patch
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

    def test_confirmation_url_falls_back_to_localhost_in_dev(self):
        confirmation = MagicMock()
        confirmation.key = "xyz"
        adapter = CustomAccountAdapter()

        # Ensure FRONTEND_URL is unset for this test
        env_without_frontend = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}
        with patch.dict(os.environ, env_without_frontend, clear=True):
            url = adapter.get_email_confirmation_url(request=None, emailconfirmation=confirmation)

        self.assertEqual(url, "http://localhost:3000/auth/verify/xyz")
