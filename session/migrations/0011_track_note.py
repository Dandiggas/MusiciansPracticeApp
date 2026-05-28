from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("session", "0010_take"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="note",
            field=models.TextField(blank=True, default=""),
        ),
    ]
