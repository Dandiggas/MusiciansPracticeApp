import mimetypes
import re

from django.http import FileResponse
from django.db import transaction
from django.db.models import Count, F
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
from .set_list import match_titles, normalize_title, parse_set_list


IMPORT_TEXT_MAX_CHARS = 5000
IMPORT_MAX_SONGS = 40
CALLED_KEY_RE = re.compile(r"^[A-G][#b]?m?$")


class SessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Session.objects.none()
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

    @action(detail=False, methods=["post"], url_path="import-set/preview")
    def import_set_preview(self, request):
        """Parse pasted set-list text and match songs against the user's own history."""
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response(
                {"text": "Paste a set list first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(text) > IMPORT_TEXT_MAX_CHARS:
            return Response(
                {"text": "That's too long for a set list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed = parse_set_list(text)[:IMPORT_MAX_SONGS]
        if not parsed:
            return Response(
                {"text": "Couldn't find any songs in that text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Latest track per normalized title, own tracks only.
        candidates = {}
        tracks = (
            Track.objects.filter(session__user=request.user)
            .select_related("session")
            .annotate(lick_count=Count("licks"))
            .order_by("updated_at")
        )
        for track in tracks:
            norm = normalize_title(track.name)
            if not norm:
                continue
            candidates[norm] = {
                "track_id": track.id,
                "track_name": track.name,
                "session_name": track.session.name,
                "source_type": track.source_type,
                "has_playable_source": bool(
                    (track.source_type == Track.SOURCE_YOUTUBE and track.youtube_url)
                    or track.file
                ),
                "bpm": track.bpm,
                "lick_count": track.lick_count,
            }

        matches = match_titles([item["title"] for item in parsed], candidates)
        items = [{**item, "match": match} for item, match in zip(parsed, matches)]
        return Response({"items": items})

    @action(detail=False, methods=["post"], url_path="import-set")
    def import_set(self, request):
        """Create a session from a confirmed set list, carrying prior work forward."""
        name = (request.data.get("name") or "").strip()
        items = request.data.get("items")

        if not name:
            return Response(
                {"name": "Give the session a name."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(items, list) or not items:
            return Response(
                {"items": "At least one song is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(items) > IMPORT_MAX_SONGS:
            return Response(
                {"items": "That's too many songs for one session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned = []
        source_ids = []
        for raw in items:
            if not isinstance(raw, dict):
                return Response(
                    {"items": "Invalid song entry."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            title = (raw.get("title") or "").strip()
            if not title:
                return Response(
                    {"items": "Every song needs a title."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            key = (raw.get("key") or "").strip()
            if key and not CALLED_KEY_RE.fullmatch(key):
                return Response(
                    {"items": f'"{key}" is not a key like Bb, F# or C#m.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            source_track_id = raw.get("source_track_id")
            if source_track_id is not None:
                if not isinstance(source_track_id, int):
                    return Response(
                        {"items": "Invalid source track."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                source_ids.append(source_track_id)
            cleaned.append(
                {"title": title[:200], "key": key, "source_track_id": source_track_id}
            )

        # Ownership check: carry-over sources must be the user's own tracks.
        sources = {
            track.id: track
            for track in Track.objects.filter(
                session__user=request.user, id__in=source_ids
            ).prefetch_related("licks")
        }
        missing = set(source_ids) - set(sources)
        if missing:
            return Response(
                {"items": "Unknown source track(s)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            new_session = Session.objects.create(user=request.user, name=name[:120])
            for position, item in enumerate(cleaned):
                source = (
                    sources.get(item["source_track_id"])
                    if item["source_track_id"] is not None
                    else None
                )
                if source is None:
                    Track.objects.create(
                        session=new_session,
                        name=item["title"],
                        source_type=Track.SOURCE_NONE,
                        called_key=item["key"],
                        position=position,
                    )
                    continue

                # Files are never shared between tracks: the post_delete signal
                # removes a deleted track's file, which would orphan the copy.
                carry_youtube = (
                    source.source_type == Track.SOURCE_YOUTUBE and source.youtube_url
                )
                new_track = Track.objects.create(
                    session=new_session,
                    name=source.name,
                    note=source.note,
                    called_key=item["key"] or source.called_key,
                    source_type=(
                        Track.SOURCE_YOUTUBE if carry_youtube else Track.SOURCE_NONE
                    ),
                    youtube_url=source.youtube_url if carry_youtube else "",
                    bpm=source.bpm,
                    last_speed=source.last_speed,
                    position=position,
                )
                if carry_youtube:
                    # Loop points keep their timing on the same video.
                    for lick in source.licks.all():
                        Lick.objects.create(
                            track=new_track,
                            name=lick.name,
                            start_seconds=lick.start_seconds,
                            end_seconds=lick.end_seconds,
                            last_speed=lick.last_speed,
                            position=lick.position,
                        )

        fresh = (
            Session.objects.filter(pk=new_session.pk)
            .prefetch_related("tracks__licks", "tracks__takes")
            .get()
        )
        serializer = SessionDetailSerializer(fresh, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TrackViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = TrackSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Track.objects.none()
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
        if not self.request.user.is_authenticated:
            return Lick.objects.none()
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
        if not self.request.user.is_authenticated:
            return Take.objects.none()
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
