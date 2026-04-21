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

    def test_demotes_other_primary_emailaddress_rows(self):
        """Users with a stale primary=True row on a different email get it
        demoted, so the migration can set the target row primary without
        tripping allauth's partial unique-primary constraint."""
        user = CustomUser.objects.create_user(
            username="dualprimary", email="target@example.com", password="x"
        )
        # Stale primary on an unrelated email — simulates leftover admin edit
        # or reverted-migration debris.
        EmailAddress.objects.create(
            user=user, email="old@example.com", verified=False, primary=True
        )

        grandfather_existing_emails(django_apps, None)

        new_row = EmailAddress.objects.get(user=user, email="target@example.com")
        old_row = EmailAddress.objects.get(user=user, email="old@example.com")

        self.assertTrue(new_row.verified)
        self.assertTrue(new_row.primary)
        self.assertFalse(old_row.primary)  # demoted

    def test_normalizes_email_case_to_lowercase(self):
        """CustomUser.email stored mixed-case finds an existing lowercase
        EmailAddress row instead of attempting a duplicate insert."""
        user = CustomUser.objects.create_user(
            username="mixedcase", email="Mixed@Example.COM", password="x"
        )
        # Existing lowercase row — allauth's canonical form.
        existing = EmailAddress.objects.create(
            user=user, email="mixed@example.com", verified=False, primary=False
        )

        grandfather_existing_emails(django_apps, None)

        # Exactly one EmailAddress row for this user — the existing one got
        # updated, not a duplicate created.
        self.assertEqual(EmailAddress.objects.filter(user=user).count(), 1)
        existing.refresh_from_db()
        self.assertEqual(existing.email, "mixed@example.com")  # unchanged
        self.assertTrue(existing.verified)
        self.assertTrue(existing.primary)

    def test_normalizes_customuser_email_to_lowercase(self):
        """Legacy user with mixed-case CustomUser.email gets it normalized
        so dj-rest-auth's case-sensitive login filter matches the lowercased
        EmailAddress row. Without this fix, legacy mixed-case users hit a
        permanent lockout after the mandatory-verify gate flips."""
        user = CustomUser.objects.create_user(
            username="legacycaps", email="Legacy@Example.COM", password="x"
        )
        grandfather_existing_emails(django_apps, None)

        user.refresh_from_db()
        self.assertEqual(user.email, "legacy@example.com")

        # EmailAddress row should also be the lowercased form.
        email_row = EmailAddress.objects.get(user=user)
        self.assertEqual(email_row.email, "legacy@example.com")
        self.assertTrue(email_row.verified)
        self.assertTrue(email_row.primary)
