from django.apps import apps as django_apps
from django.test import TestCase
from allauth.account.models import EmailAddress
from accounts.models import CustomUser
from accounts.migrations._grandfather_helpers import grandfather_existing_emails


class GrandfatherMigrationTest(TestCase):
    """The one-off data migration that makes pre-existing users verified."""

    def test_creates_verified_primary_emailaddress_for_users_without_one(self):
        user = CustomUser.objects.create_user(
            username="legacy", email="legacy@example.com", password="x"
        )
        self.assertFalse(
            EmailAddress.objects.filter(user=user).exists(),
            "Pre-condition: legacy user has no EmailAddress row.",
        )

        grandfather_existing_emails(django_apps, None)

        email = EmailAddress.objects.get(user=user)
        self.assertEqual(email.email, "legacy@example.com")
        self.assertTrue(email.verified)
        self.assertTrue(email.primary)

    def test_updates_existing_unverified_emailaddress(self):
        user = CustomUser.objects.create_user(
            username="halfdone", email="halfdone@example.com", password="x"
        )
        EmailAddress.objects.create(
            user=user, email="halfdone@example.com", verified=False, primary=False
        )

        grandfather_existing_emails(django_apps, None)

        email = EmailAddress.objects.get(user=user)
        self.assertTrue(email.verified)
        self.assertTrue(email.primary)

    def test_skips_users_without_email(self):
        user = CustomUser.objects.create_user(username="noemail", password="x")
        grandfather_existing_emails(django_apps, None)
        self.assertFalse(EmailAddress.objects.filter(user=user).exists())

    def test_idempotent_second_run_is_noop(self):
        CustomUser.objects.create_user(
            username="twice", email="twice@example.com", password="x"
        )
        grandfather_existing_emails(django_apps, None)
        count_after_first = EmailAddress.objects.count()
        grandfather_existing_emails(django_apps, None)
        self.assertEqual(EmailAddress.objects.count(), count_after_first)
