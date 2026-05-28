import mimetypes

from django.http import FileResponse
from django.db import transaction
from django.db.models import F
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Lick, Session, Take, Track
from .serializers import (
    LickSerializer,
    SessionDetailSerializer,
    SessionSerializer,
    TakeSerializer,
    TrackSerializer,
)


class SessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Session.objects.filter(user=self.request.user)
            .prefetch_related("tracks__licks", "tracks__takes")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SessionDetailSerializer
        return SessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="reorder-tracks")
    def reorder_tracks(self, request, pk=None):
        practice_session = self.get_object()
        track_ids = request.data.get("track_ids", [])

        if not isinstance(track_ids, list):
            return Response(
                {"track_ids": "Must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tracks = {track.id: track for track in practice_session.tracks.filter(id__in=track_ids)}
        if len(tracks) != len(track_ids):
            return Response(
                {"track_ids": "Unknown track id(s)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for position, track_id in enumerate(track_ids):
                track = tracks[track_id]
                track.position = position
                track.save(update_fields=["position"])

        return Response({"ok": True})


class TrackViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = TrackSerializer

    def get_queryset(self):
        return (
            Track.objects.filter(session__user=self.request.user)
            .select_related("session")
            .prefetch_related("licks", "takes")
        )

    def perform_create(self, serializer):
        practice_session = serializer.validated_data["session"]
        if practice_session.user_id != self.request.user.id:
            raise NotFound()

        insert_position = serializer.validated_data.get("position", 0)

        with transaction.atomic():
            Track.objects.filter(
                session=practice_session,
                position__gte=insert_position,
            ).update(position=F("position") + 1)
            serializer.save(position=insert_position)

    @action(detail=True, methods=["post"], url_path="reorder-licks")
    def reorder_licks(self, request, pk=None):
        track = self.get_object()
        lick_ids = request.data.get("lick_ids", [])

        if not isinstance(lick_ids, list):
            return Response(
                {"lick_ids": "Must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        licks = {lick.id: lick for lick in track.licks.filter(id__in=lick_ids)}
        if len(licks) != len(lick_ids):
            return Response(
                {"lick_ids": "Unknown lick id(s)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for position, lick_id in enumerate(lick_ids):
                lick = licks[lick_id]
                lick.position = position
                lick.save(update_fields=["position"])

        return Response({"ok": True})


class LickViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LickSerializer

    def get_queryset(self):
        return Lick.objects.filter(track__session__user=self.request.user).select_related(
            "track",
            "track__session",
        )

    def perform_create(self, serializer):
        track = serializer.validated_data["track"]
        if track.session.user_id != self.request.user.id:
            raise NotFound()
        serializer.save()


class TakeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = TakeSerializer

    def get_queryset(self):
        return Take.objects.filter(track__session__user=self.request.user).select_related(
            "track",
            "track__session",
        )

    def perform_create(self, serializer):
        track = serializer.validated_data["track"]
        if track.session.user_id != self.request.user.id:
            raise NotFound()
        serializer.save()

    @action(detail=True, methods=["get"], url_path="file")
    def file(self, request, pk=None):
        take = self.get_object()
        if not take.file:
            raise NotFound()

        content_type = mimetypes.guess_type(take.file.name)[0] or "application/octet-stream"
        return FileResponse(
            take.file.open("rb"),
            content_type=content_type,
            filename=take.file.name.rsplit("/", 1)[-1],
        )
