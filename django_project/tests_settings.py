from django.conf import settings
from django.test import TestCase


class AuthSettingsTest(TestCase):
    def test_email_verification_is_mandatory(self):
        self.assertEqual(settings.ACCOUNT_EMAIL_VERIFICATION, "mandatory")

    def test_email_required(self):
        self.assertTrue(settings.ACCOUNT_EMAIL_REQUIRED)

    def test_confirm_email_on_get_is_disabled(self):
        # We handle confirmation via our own POST endpoint; allauth's
        # GET-based confirm view would bypass the auto-login path.
        self.assertFalse(settings.ACCOUNT_CONFIRM_EMAIL_ON_GET)

    def test_confirmation_expiry_is_one_day(self):
        self.assertEqual(settings.ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS, 1)

    def test_custom_adapter_is_configured(self):
        self.assertEqual(
            settings.ACCOUNT_ADAPTER, "accounts.adapter.CustomAccountAdapter"
        )

    def test_templates_dirs_includes_repo_root_templates(self):
        dirs = settings.TEMPLATES[0]["DIRS"]
        self.assertTrue(
            any(str(d).endswith("templates") for d in dirs),
            f"Expected 'templates' entry in TEMPLATES[0]['DIRS'], got {dirs}",
        )

    def test_default_from_email_set(self):
        self.assertTrue(settings.DEFAULT_FROM_EMAIL)

    def test_startup_diagnostics_module_exists(self):
        from django_project.startup_checks import has_frontend_url
        self.assertTrue(callable(has_frontend_url))
