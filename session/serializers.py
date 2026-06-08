import os

from django.conf import settings
from rest_framework import serializers

from .models import Lick, Session, Take, Track


AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
PDF_EXTS = {".pdf"}
TAKE_AUDIO_EXTS = AUDIO_EXTS | {".webm"}
TAKE_VIDEO_EXTS = {".webm", ".mp4", ".mov", ".m4v"}


def _ext(file_obj) -> str:
    return os.path.splitext(getattr(file_obj, "name", "") or "")[1].lower()


def _file_size_error(file_obj, limit: int, label: str) -> str | None:
    size = getattr(file_obj, "size", 0) or 0
    if size <= limit:
        return None

    max_mb = limit / (1024 * 1024)
    return f"{label} must be {max_mb:.0f} MB or smaller."


class LickSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lick
        fields = [
            "id",
            "track",
            "name",
            "start_seconds",
            "end_seconds",
            "last_speed",
            "position",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        track = attrs.get("track") or getattr(self.instance, "track", None)
        if track and track.source_type in (Track.SOURCE_PDF, Track.SOURCE_IMAGE):
            raise serializers.ValidationError(
                {"track": "Licks are only allowed on audio tracks."}
            )

        start = attrs.get(
            "start_seconds",
            getattr(self.instance, "start_seconds", None),
        )
        end = attrs.get(
            "end_seconds",
            getattr(self.instance, "end_seconds", None),
        )
        if start is not None and end is not None and end <= start:
            raise serializers.ValidationError(
                {"end_seconds": "end_seconds must be greater than start_seconds."}
            )

        return attrs


class TakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Take
        fields = [
            "id",
            "track",
            "name",
            "capture_mode",
            "file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        if self.instance is not None:
            disallowed = set(attrs) - {"name"}
            if disallowed:
                raise serializers.ValidationError(
                    {"name": "Only the take name can be edited."}
                )
            if not attrs.get("name", "").strip():
                raise serializers.ValidationError({"name": "This field may not be blank."})
            return attrs

        capture_mode = attrs.get("capture_mode")
        file_obj = attrs.get("file")

        errors = {}

        if not capture_mode:
            errors["capture_mode"] = "This field is required."

        if not file_obj:
            errors["file"] = "A recorded file is required."
        else:
            extension = _ext(file_obj)
            size_error = _file_size_error(
                file_obj,
                settings.TAKE_FILE_MAX_UPLOAD_SIZE,
                "Recorded files",
            )
            if size_error:
                errors["file"] = size_error
            elif capture_mode == Take.MODE_AUDIO and extension not in TAKE_AUDIO_EXTS:
                errors["file"] = "Audio takes must be an audio-compatible file."
            elif capture_mode in (Take.MODE_VIDEO, Take.MODE_VIDEO_AUDIO) and extension not in TAKE_VIDEO_EXTS:
                errors["file"] = "Video takes must be a video-compatible file."

        if capture_mode not in {
            Take.MODE_AUDIO,
            Take.MODE_VIDEO,
            Take.MODE_VIDEO_AUDIO,
        }:
            errors["capture_mode"] = "Invalid capture mode."

        if not attrs.get("name", "").strip():
            errors["name"] = "This field may not be blank."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class TrackSerializer(serializers.ModelSerializer):
    licks = LickSerializer(many=True, read_only=True)
    takes = TakeSerializer(many=True, read_only=True)

    class Meta:
        model = Track
        fields = [
            "id",
            "session",
            "name",
            "note",
            "source_type",
            "youtube_url",
            "file",
            "bpm",
            "last_speed",
            "position",
            "licks",
            "takes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "licks", "takes", "created_at", "updated_at"]

    def validate(self, attrs):
        source_type = attrs.get("source_type", getattr(self.instance, "source_type", None))
        youtube_url = attrs.get(
            "youtube_url",
            getattr(self.instance, "youtube_url", "") or "",
        )
        file_obj = attrs.get("file", getattr(self.instance, "file", None))

        errors = {}

        if source_type == Track.SOURCE_YOUTUBE:
            if not youtube_url:
                errors["youtube_url"] = "Required for YouTube tracks."
            if file_obj:
                errors["file"] = "YouTube tracks must not have a file."
        elif source_type == Track.SOURCE_MP3:
            if not file_obj:
                errors["file"] = "Required for MP3 tracks."
            else:
                size_error = _file_size_error(
                    file_obj,
                    settings.TRACK_FILE_MAX_UPLOAD_SIZE,
                    "Track files",
                )
                if size_error:
                    errors["file"] = size_error
                elif _ext(file_obj) not in AUDIO_EXTS:
                    errors["file"] = "Must be an audio file."
            if youtube_url:
                errors["youtube_url"] = "MP3 tracks must not have a URL."
        elif source_type == Track.SOURCE_PDF:
            if not file_obj:
                errors["file"] = "Required for PDF tracks."
            else:
                size_error = _file_size_error(
                    file_obj,
                    settings.TRACK_FILE_MAX_UPLOAD_SIZE,
                    "Track files",
                )
                if size_error:
                    errors["file"] = size_error
                elif _ext(file_obj) not in PDF_EXTS:
                    errors["file"] = "Must be a PDF file."
            if youtube_url:
                errors["youtube_url"] = "PDF tracks must not have a URL."
        elif source_type == Track.SOURCE_IMAGE:
            if not file_obj:
                errors["file"] = "Required for image tracks."
            else:
                size_error = _file_size_error(
                    file_obj,
                    settings.TRACK_FILE_MAX_UPLOAD_SIZE,
                    "Track files",
                )
                if size_error:
                    errors["file"] = size_error
                elif _ext(file_obj) not in IMAGE_EXTS:
                    errors["file"] = "Must be an image file."
            if youtube_url:
                errors["youtube_url"] = "Image tracks must not have a URL."
        else:
            errors["source_type"] = "Invalid source type."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SessionDetailSerializer(serializers.ModelSerializer):
    tracks = TrackSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ["id", "name", "tracks", "created_at", "updated_at"]
        read_only_fields = ["id", "tracks", "created_at", "updated_at"]
