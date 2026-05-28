from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Session(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="practice_sessions",
    )
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class Track(models.Model):
    SOURCE_YOUTUBE = "youtube"
    SOURCE_MP3 = "mp3"
    SOURCE_PDF = "pdf"
    SOURCE_IMAGE = "image"
    SOURCE_CHOICES = [
        (SOURCE_YOUTUBE, "YouTube"),
        (SOURCE_MP3, "MP3"),
        (SOURCE_PDF, "PDF"),
        (SOURCE_IMAGE, "Image"),
    ]

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="tracks",
    )
    name = models.CharField(max_length=200)
    note = models.TextField(blank=True, default="")
    source_type = models.CharField(max_length=10, choices=SOURCE_CHOICES)
    youtube_url = models.URLField(max_length=500, blank=True, default="")
    file = models.FileField(upload_to="tracks/", blank=True, null=True)
    bpm = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(300)],
    )
    last_speed = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.25), MaxValueValidator(1.5)],
    )
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "created_at"]

    def __str__(self):
        return f"{self.name} ({self.source_type})"


class Lick(models.Model):
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name="licks",
    )
    name = models.CharField(max_length=200)
    start_seconds = models.FloatField(validators=[MinValueValidator(0)])
    end_seconds = models.FloatField()
    last_speed = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.25), MaxValueValidator(1.5)],
    )
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "created_at"]

    def __str__(self):
        return self.name


class Take(models.Model):
    MODE_AUDIO = "audio"
    MODE_VIDEO = "video"
    MODE_VIDEO_AUDIO = "video_audio"
    MODE_CHOICES = [
        (MODE_AUDIO, "Audio Only"),
        (MODE_VIDEO, "Video Only"),
        (MODE_VIDEO_AUDIO, "Video + Audio"),
    ]

    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name="takes",
    )
    name = models.CharField(max_length=200)
    capture_mode = models.CharField(max_length=12, choices=MODE_CHOICES)
    file = models.FileField(upload_to="takes/")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.name
