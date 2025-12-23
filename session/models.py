from django.conf import settings
from django.db import models
import datetime
from django.contrib.auth.models import User
from django.utils import timezone


class Tag(models.Model):
    """Tag model for categorizing practice sessions"""
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color code
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['name', 'user']
        ordering = ['name']

    def __str__(self):
        return self.name


class Session(models.Model):
    SKILL_LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    INSTRUMENT_CHOICES = [
        ('guitar', 'Guitar'),
        ('piano', 'Piano'),
        ('drums', 'Drums'),
        ('bass', 'Bass'),
    ]

    session_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    instrument = models.CharField(max_length=200, default='Insert instrument')
    duration = models.DurationField()
    description = models.CharField(max_length=200, default='Insert description')
    session_date = models.DateField()
    display_id = models.PositiveIntegerField(default=0)
    skill_level = models.CharField(max_length=20, choices=SKILL_LEVEL_CHOICES, default="Instrument Choice")
    instrument_preference = models.CharField(max_length=20, choices=INSTRUMENT_CHOICES, default="Instrument Choice")
    goals = models.TextField(default='Insert Goal')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    # Tags
    tags = models.ManyToManyField(Tag, blank=True, related_name='sessions')

    # Timer fields
    in_progress = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    paused_duration = models.DurationField(default=timezone.timedelta(seconds=0))
    paused_at = models.DateTimeField(null=True, blank=True)
    is_paused = models.BooleanField(default=False)

    def __str__(self):
        return f"Session on {self.session_date.strftime('%d-%m-%Y')}"

