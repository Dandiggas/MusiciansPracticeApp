import os
from unittest.mock import patch
from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase, override_settings
from django_project.startup_checks import check_frontend_url


class CheckFrontendUrlTest(TestCase):
    @override_settings(DEBUG=False)
    def test_raises_when_frontend_url_missing_and_debug_false(self):
        env_without = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}
        with patch.dict(os.environ, env_without, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                check_frontend_url()

    @override_settings(DEBUG=False)
    def test_passes_when_frontend_url_set_and_debug_false(self):
        with patch.dict(os.environ, {"FRONTEND_URL": "https://theshed.app"}):
            check_frontend_url()  # no raise

    @override_settings(DEBUG=True)
    def test_passes_when_debug_true_regardless_of_env(self):
        env_without = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}
        with patch.dict(os.environ, env_without, clear=True):
            check_frontend_url()  # no raise — dev has localhost fallback
