import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from session.models import Lick, Session, Track


pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def alice():
    return User.objects.create_user(username="alice", password="pw")


@pytest.fixture
def bob():
    return User.objects.create_user(username="bob", password="pw")


@pytest.fixture
def practice_session(alice):
    return Session.objects.create(user=alice, name="Kevin Bond")


@pytest.fixture
def client_for():
    def _make(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _make


def test_create_youtube_track(alice, practice_session, client_for):
    response = client_for(alice).post(
        reverse("track-list"),
        {
            "session": practice_session.id,
            "name": "Praise on Demand",
            "source_type": "youtube",
            "youtube_url": "https://youtu.be/abc",
            "position": 0,
        },
        format="json",
    )

    assert response.status_code == 201, response.json()


def test_create_mp3_track_multipart(alice, practice_session, client_for, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    file_obj = SimpleUploadedFile("clip.mp3", b"abc", content_type="audio/mpeg")

    response = client_for(alice).post(
        reverse("track-list"),
        {
            "session": practice_session.id,
            "name": "Praise on Demand",
            "source_type": "mp3",
            "file": file_obj,
            "position": 0,
        },
        format="multipart",
    )

    assert response.status_code == 201, response.json()


def test_create_track_in_other_users_session_404s(alice, bob, client_for):
    other_session = Session.objects.create(user=bob, name="Other")

    response = client_for(alice).post(
        reverse("track-list"),
        {
            "session": other_session.id,
            "name": "Stolen",
            "source_type": "youtube",
            "youtube_url": "https://youtu.be/abc",
            "position": 0,
        },
        format="json",
    )

    assert response.status_code == 404


def test_patch_track_bpm(alice, practice_session, client_for):
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="youtube",
        youtube_url="https://youtu.be/abc",
        position=0,
    )

    response = client_for(alice).patch(
        reverse("track-detail", args=[track.id]),
        {"bpm": 120},
        format="json",
    )

    assert response.status_code == 200
    track.refresh_from_db()
    assert track.bpm == 120


def test_patch_track_note(alice, practice_session, client_for):
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="youtube",
        youtube_url="https://youtu.be/abc",
        position=0,
    )

    response = client_for(alice).patch(
        reverse("track-detail", args=[track.id]),
        {"note": "Left hand needs to stay lighter in the intro."},
        format="json",
    )

    assert response.status_code == 200
    track.refresh_from_db()
    assert track.note == "Left hand needs to stay lighter in the intro."


def test_delete_track_cascades_licks(alice, practice_session, client_for):
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )
    Lick.objects.create(
        track=track,
        name="Intro",
        start_seconds=0,
        end_seconds=1,
        position=0,
    )

    response = client_for(alice).delete(reverse("track-detail", args=[track.id]))

    assert response.status_code == 204
    assert Lick.objects.count() == 0


def test_reorder_licks(alice, practice_session, client_for):
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )
    first = Lick.objects.create(
        track=track,
        name="A",
        start_seconds=0,
        end_seconds=1,
        position=0,
    )
    second = Lick.objects.create(
        track=track,
        name="B",
        start_seconds=1,
        end_seconds=2,
        position=1,
    )

    response = client_for(alice).post(
        reverse("track-reorder-licks", args=[track.id]),
        {"lick_ids": [second.id, first.id]},
        format="json",
    )

    assert response.status_code == 200
    first.refresh_from_db()
    second.refresh_from_db()
    assert (second.position, first.position) == (0, 1)


def test_create_track_at_top_shifts_existing_positions(alice, practice_session, client_for):
    first = Track.objects.create(
        session=practice_session,
        name="First",
        source_type="youtube",
        youtube_url="https://youtu.be/abc",
        position=0,
    )
    second = Track.objects.create(
        session=practice_session,
        name="Second",
        source_type="youtube",
        youtube_url="https://youtu.be/def",
        position=1,
    )

    response = client_for(alice).post(
        reverse("track-list"),
        {
            "session": practice_session.id,
            "name": "Newest",
            "source_type": "youtube",
            "youtube_url": "https://youtu.be/ghi",
            "position": 0,
        },
        format="json",
    )

    assert response.status_code == 201, response.json()

    first.refresh_from_db()
    second.refresh_from_db()
    created = Track.objects.get(id=response.json()["id"])

    assert created.position == 0
    assert first.position == 1
    assert second.position == 2
