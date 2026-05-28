import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from session.models import Session, Take, Track


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


def test_create_audio_take_multipart(alice, practice_session, client_for, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    file_obj = SimpleUploadedFile("intro-take.webm", b"abc", content_type="audio/webm")

    response = client_for(alice).post(
        reverse("take-list"),
        {
            "track": track.id,
            "name": "Intro take",
            "capture_mode": "audio",
            "file": file_obj,
        },
        format="multipart",
    )

    assert response.status_code == 201, response.json()


def test_create_take_in_other_users_track_404s(alice, bob, client_for, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    other_session = Session.objects.create(user=bob, name="Other")
    track = Track.objects.create(
        session=other_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    file_obj = SimpleUploadedFile("intro-take.webm", b"abc", content_type="audio/webm")

    response = client_for(alice).post(
        reverse("take-list"),
        {
            "track": track.id,
            "name": "Stolen take",
            "capture_mode": "audio",
            "file": file_obj,
        },
        format="multipart",
    )

    assert response.status_code == 404


def test_patch_take_name(alice, practice_session, client_for):
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

    response = client_for(alice).patch(
        reverse("take-detail", args=[take.id]),
        {"name": "New take"},
        format="json",
    )

    assert response.status_code == 200, response.json()
    take.refresh_from_db()
    assert take.name == "New take"


def test_patch_take_rejects_file_edit(alice, practice_session, client_for):
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

    response = client_for(alice).patch(
        reverse("take-detail", args=[take.id]),
        {"capture_mode": "video"},
        format="json",
    )

    assert response.status_code == 400


def test_delete_take(alice, practice_session, client_for):
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

    response = client_for(alice).delete(reverse("take-detail", args=[take.id]))

    assert response.status_code == 204
    assert Take.objects.count() == 0


def test_take_file_endpoint_streams_owned_recording(alice, practice_session, client_for, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    take = Take.objects.create(
        track=track,
        name="Video take",
        capture_mode="video_audio",
        file=SimpleUploadedFile("video-take.webm", b"recorded-video", content_type="video/webm"),
    )

    response = client_for(alice).get(reverse("take-file", args=[take.id]))

    assert response.status_code == 200
    assert response["Content-Type"] == "video/webm"
    assert b"".join(response.streaming_content) == b"recorded-video"


def test_take_file_endpoint_hides_other_users_recording(alice, bob, client_for, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    other_session = Session.objects.create(user=bob, name="Other")
    track = Track.objects.create(
        session=other_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    take = Take.objects.create(
        track=track,
        name="Video take",
        capture_mode="video_audio",
        file=SimpleUploadedFile("video-take.webm", b"recorded-video", content_type="video/webm"),
    )

    response = client_for(alice).get(reverse("take-file", args=[take.id]))

    assert response.status_code == 404
