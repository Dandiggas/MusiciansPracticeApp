import os
from unittest.mock import patch
from django.test import TestCase
from django_project.startup_checks import has_frontend_url


class CheckFrontendUrlTest(TestCase):
    def test_reports_false_when_frontend_url_missing(self):
        env_without = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}
        with patch.dict(os.environ, env_without, clear=True):
            self.assertFalse(has_frontend_url())

    def test_reports_true_when_frontend_url_set(self):
        with patch.dict(os.environ, {"FRONTEND_URL": "https://theshed.app"}):
            self.assertTrue(has_frontend_url())
