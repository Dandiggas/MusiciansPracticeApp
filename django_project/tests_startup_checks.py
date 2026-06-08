import os
from unittest.mock import patch
from django.test import TestCase
from django_project.startup_checks import email_delivery_status, has_frontend_url


class CheckFrontendUrlTest(TestCase):
    def test_reports_false_when_frontend_url_missing(self):
        env_without = {k: v for k, v in os.environ.items() if k != "FRONTEND_URL"}
        with patch.dict(os.environ, env_without, clear=True):
            self.assertFalse(has_frontend_url())

    def test_reports_true_when_frontend_url_set(self):
        with patch.dict(os.environ, {"FRONTEND_URL": "https://theshed.app"}):
            self.assertTrue(has_frontend_url())


class EmailDeliveryStatusTest(TestCase):
    def test_reports_missing_sendgrid_inputs(self):
        status = email_delivery_status({})

        self.assertFalse(status["ready"])
        self.assertFalse(status["uses_sendgrid"])
        self.assertEqual(
            status["email_backend"], "django.core.mail.backends.console.EmailBackend"
        )
        self.assertIn("SENDGRID_API_KEY", status["missing"])
        self.assertIn("FRONTEND_URL", status["missing"])

    def test_reports_ready_when_sendgrid_inputs_exist(self):
        status = email_delivery_status(
            {
                "SENDGRID_API_KEY": "secret",
                "DEFAULT_FROM_EMAIL": "hello@theshed.app",
                "FRONTEND_URL": "https://app.theshed.app",
            }
        )

        self.assertTrue(status["ready"])
        self.assertTrue(status["uses_sendgrid"])
        self.assertEqual(
            status["email_backend"],
            "django_project.email_backends.SendGridApiEmailBackend",
        )
        self.assertEqual(status["email_host"], "api.sendgrid.com")
        self.assertEqual(status["email_port"], "443")
        self.assertEqual(status["email_host_user"], "(api token)")
        self.assertEqual(status["missing"], [])
