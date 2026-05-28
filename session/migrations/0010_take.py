from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("session", "0009_replace_session_with_playlist"),
    ]

    operations = [
        migrations.CreateModel(
            name="Take",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                (
                    "capture_mode",
                    models.CharField(
                        choices=[
                            ("audio", "Audio Only"),
                            ("video", "Video Only"),
                            ("video_audio", "Video + Audio"),
                        ],
                        max_length=12,
                    ),
                ),
                ("file", models.FileField(upload_to="takes/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "track",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="takes",
                        to="session.track",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
