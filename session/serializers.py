from rest_framework import serializers

from django.db import models
from .models import Session, Tag, SheetMusic


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'color', 'user', 'created_at')
        read_only_fields = ('user', 'created_at')


class SessionSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        source='tags',
        write_only=True,
        required=False
    )

    class Meta:
        fields = (
            "session_id",
            "display_id",
            "user",
            "instrument",
            "duration",
            "description",
            "session_date",
            "tags",
            "tag_ids",
            "in_progress",
            "started_at",
            "paused_duration",
            "paused_at",
            "is_paused",
            "youtube_url",
        )
        model = Session
        read_only_fields = ['display_id', 'user']


import hashlib
import pikepdf


MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
MAX_PAGE_COUNT = 50
MAX_USER_STORAGE = 200 * 1024 * 1024  # 200 MB


class SheetMusicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SheetMusic
        fields = (
            "id",
            "title",
            "file",
            "file_size",
            "page_count",
            "file_hash",
            "last_page_viewed",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("file_size", "page_count", "file_hash", "created_at", "updated_at")

    def validate_file(self, value):
        if value.content_type != "application/pdf":
            raise serializers.ValidationError("Only PDF files are accepted.")
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size exceeds {MAX_FILE_SIZE // (1024 * 1024)} MB limit."
            )
        return value

    def validate(self, attrs):
        request = self.context["request"]
        uploaded_file = attrs.get("file")

        if uploaded_file:
            # Check page count
            try:
                uploaded_file.seek(0)
                pdf = pikepdf.open(uploaded_file)
                page_count = len(pdf.pages)
                pdf.close()
                uploaded_file.seek(0)
            except Exception:
                raise serializers.ValidationError({"file": "Could not read PDF. File may be corrupted."})

            if page_count > MAX_PAGE_COUNT:
                raise serializers.ValidationError(
                    {"file": f"PDF has {page_count} pages. Maximum is {MAX_PAGE_COUNT}."}
                )

            # Compute hash
            hasher = hashlib.sha256()
            uploaded_file.seek(0)
            for chunk in uploaded_file.chunks():
                hasher.update(chunk)
            file_hash = hasher.hexdigest()
            uploaded_file.seek(0)

            # Check for duplicate content
            existing = SheetMusic.objects.filter(user=request.user, file_hash=file_hash).first()
            if existing:
                raise serializers.ValidationError(
                    {"file": f"You already have this file uploaded as \"{existing.title}\" (ID: {existing.id})."}
                )

            # Check storage quota
            current_usage = (
                SheetMusic.objects.filter(user=request.user)
                .aggregate(total=models.Sum("file_size"))["total"]
                or 0
            )
            if current_usage + uploaded_file.size > MAX_USER_STORAGE:
                raise serializers.ValidationError(
                    {"file": "Storage quota exceeded (200 MB). Delete some files to make room."}
                )

            attrs["file_size"] = uploaded_file.size
            attrs["page_count"] = page_count
            attrs["file_hash"] = file_hash

        return attrs


class SheetMusicUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SheetMusic
        fields = ("title", "last_page_viewed")
