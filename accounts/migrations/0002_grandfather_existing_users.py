from django.db import migrations
from accounts.migrations._grandfather_helpers import grandfather_existing_emails


def reverse_noop(apps, schema_editor):
    """Forward-only — reversing would re-unverify everyone, the opposite of intent."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("account", "0009_emailaddress_unique_primary_email"),
    ]

    operations = [
        migrations.RunPython(grandfather_existing_emails, reverse_noop),
    ]
