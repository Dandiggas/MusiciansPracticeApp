import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from session.models import Session, Take, Track
from session.serializers import (
    LickSerializer,
    SessionDetailSerializer,
    TakeSerializer,
    TrackSerializer,
)


pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(username="alice", password="pw")


@pytest.fixture
def practice_session(user):
    return Session.objects.create(user=user, name="Kevin Bond")


def test_youtube_track_requires_url(practice_session):
    serializer = TrackSerializer(
        data={
            "session": practice_session.id,
            "name": "Tune",
            "source_type": "youtube",
            "position": 0,
        }
    )

    assert not serializer.is_valid()
    assert "youtube_url" in serializer.errors


def test_youtube_track_rejects_file(practice_session):
    file_obj = SimpleUploadedFile("clip.mp3", b"abc", content_type="audio/mpeg")
    serializer = TrackSerializer(
        data={
            "session": practice_session.id,
            "name": "Tune",
            "source_type": "youtube",
            "youtube_url": "https://youtu.be/abc",
            "file": file_obj,
            "position": 0,
        }
    )

    assert not serializer.is_valid()
    assert "file" in serializer.errors


def test_mp3_track_requires_audio_file(practice_session):
    file_obj = SimpleUploadedFile("notes.txt", b"abc", content_type="text/plain")
    serializer = TrackSerializer(
        data={
            "session": practice_session.id,
            "name": "Tune",
            "source_type": "mp3",
            "file": file_obj,
            "position": 0,
        }
    )

    assert not serializer.is_valid()
    assert "file" in serializer.errors


def test_mp3_track_with_audio_file_is_valid(practice_session):
    file_obj = SimpleUploadedFile("clip.mp3", b"abc", content_type="audio/mpeg")
    serializer = TrackSerializer(
        data={
            "session": practice_session.id,
            "name": "Tune",
            "source_type": "mp3",
            "file": file_obj,
            "position": 0,
        }
    )

    assert serializer.is_valid(), serializer.errors


def test_pdf_track_rejects_url(practice_session):
    file_obj = SimpleUploadedFile("chart.pdf", b"%PDF", content_type="application/pdf")
    serializer = TrackSerializer(
        data={
            "session": practice_session.id,
            "name": "Chart",
            "source_type": "pdf",
            "youtube_url": "https://youtu.be/abc",
            "file": file_obj,
            "position": 0,
        }
    )

    assert not serializer.is_valid()
    assert "youtube_url" in serializer.errors


def test_lick_rejected_on_sheet_track(practice_session):
    track = Track.objects.create(
        session=practice_session,
        name="Chart",
        source_type="pdf",
        position=0,
    )
    serializer = LickSerializer(
        data={
            "track": track.id,
            "name": "Verse",
            "start_seconds": 1.0,
            "end_seconds": 2.0,
            "position": 0,
        }
    )

    assert not serializer.is_valid()
    assert "track" in serializer.errors


def test_lick_end_must_be_after_start(practice_session):
    track = Track.objects.create(
        session=practice_session,
        name="Tune",
        source_type="mp3",
        position=0,
    )
    serializer = LickSerializer(
        data={
            "track": track.id,
            "name": "Verse",
            "start_seconds": 3.0,
            "end_seconds": 2.0,
            "position": 0,
        }
    )

    assert not serializer.is_valid()
    assert "end_seconds" in serializer.errors


def test_session_detail_serializes_nested_tracks_and_licks(practice_session):
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        note="Check the voicing under the hook.",
        source_type="mp3",
        position=0,
    )
    track.licks.create(
        name="Intro",
        start_seconds=1.0,
        end_seconds=2.0,
        position=0,
    )
    track.takes.create(
        name="Intro attempt",
        capture_mode="audio",
        file="takes/intro-attempt.webm",
    )

    data = SessionDetailSerializer(instance=practice_session).data

    assert data["name"] == "Kevin Bond"
    assert len(data["tracks"]) == 1
    assert data["tracks"][0]["note"] == "Check the voicing under the hook."
    assert len(data["tracks"][0]["licks"]) == 1
    assert len(data["tracks"][0]["takes"]) == 1


def test_track_serializer_accepts_note(practice_session):
    serializer = TrackSerializer(
        data={
            "session": practice_session.id,
            "name": "Tune",
            "note": "Lay back in the verse.",
            "source_type": "youtube",
            "youtube_url": "https://youtu.be/abc",
            "position": 0,
        }
    )

    assert serializer.is_valid(), serializer.errors


def test_audio_take_with_webm_file_is_valid(practice_session):
    file_obj = SimpleUploadedFile("intro-take.webm", b"abc", content_type="audio/webm")
    serializer = TakeSerializer(
        data={
            "track": Track.objects.create(
                session=practice_session,
                name="Manifest",
                source_type="youtube",
                youtube_url="https://youtu.be/example",
                position=0,
            ).id,
            "name": "Intro take",
            "capture_mode": "audio",
            "file": file_obj,
        }
    )

    assert serializer.is_valid(), serializer.errors


def test_video_take_rejects_audio_extension(practice_session):
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    file_obj = SimpleUploadedFile("intro-take.mp3", b"abc", content_type="audio/mpeg")
    serializer = TakeSerializer(
        data={
            "track": track.id,
            "name": "Video take",
            "capture_mode": "video",
            "file": file_obj,
        }
    )

    assert not serializer.is_valid()
    assert "file" in serializer.errors


def test_take_update_only_allows_name(practice_session):
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    take = Take.objects.create(
        track=track,
        name="Old take",
        capture_mode="audio",
        file="takes/old-take.webm",
    )
    serializer = TakeSerializer(
        instance=take,
        data={"capture_mode": "video"},
        partial=True,
    )

    assert not serializer.is_valid()
    assert "name" in serializer.errors
