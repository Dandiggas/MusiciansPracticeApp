"""
Forward function for the grandfather migration. Kept in a separate module
(not on the migration class itself) so it's importable by tests without
triggering migration-graph side effects.
"""


def grandfather_existing_emails(apps, schema_editor):
    EmailAddress = apps.get_model("account", "EmailAddress")
    User = apps.get_model("accounts", "CustomUser")

    for user in User.objects.all():
        email = (user.email or "").strip()
        if not email:
            continue
        EmailAddress.objects.update_or_create(
            user=user,
            email=email,
            defaults={"verified": True, "primary": True},
        )
