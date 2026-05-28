from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("session", "0008_session_youtube_url"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Session",
        ),
        migrations.DeleteModel(
            name="Tag",
        ),
        migrations.CreateModel(
            name="Session",
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
                ("name", models.CharField(max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="practice_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="Track",
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
                    "source_type",
                    models.CharField(
                        choices=[
                            ("youtube", "YouTube"),
                            ("mp3", "MP3"),
                            ("pdf", "PDF"),
                            ("image", "Image"),
                        ],
                        max_length=10,
                    ),
                ),
                ("youtube_url", models.URLField(blank=True, default="", max_length=500)),
                ("file", models.FileField(blank=True, null=True, upload_to="tracks/")),
                (
                    "bpm",
                    models.PositiveSmallIntegerField(
                        blank=True,
                        null=True,
                        validators=[MinValueValidator(30), MaxValueValidator(300)],
                    ),
                ),
                (
                    "last_speed",
                    models.FloatField(
                        blank=True,
                        null=True,
                        validators=[MinValueValidator(0.25), MaxValueValidator(1.5)],
                    ),
                ),
                ("position", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="tracks",
                        to="session.session",
                    ),
                ),
            ],
            options={
                "ordering": ["position", "created_at"],
            },
        ),
        migrations.CreateModel(
            name="Lick",
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
                    "start_seconds",
                    models.FloatField(validators=[MinValueValidator(0)]),
                ),
                ("end_seconds", models.FloatField()),
                (
                    "last_speed",
                    models.FloatField(
                        blank=True,
                        null=True,
                        validators=[MinValueValidator(0.25), MaxValueValidator(1.5)],
                    ),
                ),
                ("position", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "track",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="licks",
                        to="session.track",
                    ),
                ),
            ],
            options={
                "ordering": ["position", "created_at"],
            },
        ),
    ]
