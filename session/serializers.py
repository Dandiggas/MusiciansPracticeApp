from rest_framework import serializers

from .models import Session, Tag


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
        )
        model = Session
        read_only_fields = ['display_id', 'user']

