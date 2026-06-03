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
        original_email = user.email or ""
        email = original_email.strip().lower()
        if not email:
            continue

        # Normalize CustomUser.email too, so dj-rest-auth's login serializer
        # (which does case-sensitive filter(email=user.email, verified=True))
        # finds the lowercased EmailAddress row we're about to create/update.
        # Without this, legacy users with mixed-case user.email get a verified
        # EmailAddress row but cannot log in — permanent lockout.
        if user.email != email:
            user.email = email
            user.save(update_fields=["email"])

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
