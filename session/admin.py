from django.contrib import admin

from .models import Lick, Session, Take, Track


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user", "updated_at")
    search_fields = ("name", "user__username")


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "session", "source_type", "position")
    list_filter = ("source_type",)
    search_fields = ("name", "session__name")


@admin.register(Lick)
class LickAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "track", "position", "last_speed")
    search_fields = ("name", "track__name")


@admin.register(Take)
class TakeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "track", "capture_mode", "created_at")
    list_filter = ("capture_mode",)
    search_fields = ("name", "track__name")
