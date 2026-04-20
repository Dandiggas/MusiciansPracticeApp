"""
Forward function for the grandfather migration. Kept in a separate module
(not on the migration class itself) so it's importable by tests without
triggering migration-graph side effects.
"""


def grandfather_existing_emails(apps, schema_editor):
    EmailAddress = apps.get_model("account", "EmailAddress")
    User = apps.get_model("accounts", "CustomUser")

    for user in User.objects.all():
        # Normalize to lowercase to match allauth's canonical form. Without
        # this, a CustomUser.email of "Dan@Example.com" would miss an
        # existing lowercase EmailAddress row and attempt a duplicate INSERT
        # that trips allauth's partial unique-verified-email index.
        email = (user.email or "").strip().lower()
        if not email:
            continue

        # Demote any OTHER primary rows for this user first. Allauth's
        # partial unique constraint on (user, primary=True) rejects a second
        # primary=True for the same user; setting our target row primary
        # without this step would IntegrityError on users who already have
        # a primary row with a different email (leftover admin edits,
        # reverted-migration debris, etc.).
        EmailAddress.objects.filter(user=user, primary=True).exclude(
            email__iexact=email
        ).update(primary=False)

        EmailAddress.objects.update_or_create(
            user=user,
            email=email,
            defaults={"verified": True, "primary": True},
        )
