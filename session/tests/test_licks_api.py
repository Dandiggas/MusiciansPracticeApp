import pytest
from django.contrib.auth import get_user_model
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
def client_for():
    def _make(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _make


def test_create_lick_on_audio_track(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )

    response = client_for(alice).post(
        reverse("lick-list"),
        {
            "track": track.id,
            "name": "Intro",
            "start_seconds": 5.0,
            "end_seconds": 10.0,
            "position": 0,
        },
        format="json",
    )

    assert response.status_code == 201, response.json()


def test_lick_other_users_track_404s(alice, bob, client_for):
    practice_session = Session.objects.create(user=bob, name="Other")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )

    response = client_for(alice).post(
        reverse("lick-list"),
        {
            "track": track.id,
            "name": "Intro",
            "start_seconds": 5.0,
            "end_seconds": 10.0,
            "position": 0,
        },
        format="json",
    )

    assert response.status_code == 404


def test_patch_lick(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )
    lick = Lick.objects.create(
        track=track,
        name="Intro",
        start_seconds=0,
        end_seconds=1,
        position=0,
    )

    response = client_for(alice).patch(
        reverse("lick-detail", args=[lick.id]),
        {"last_speed": 0.75},
        format="json",
    )

    assert response.status_code == 200
    lick.refresh_from_db()
    assert lick.last_speed == 0.75


def test_delete_lick(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )
    lick = Lick.objects.create(
        track=track,
        name="Intro",
        start_seconds=0,
        end_seconds=1,
        position=0,
    )

    response = client_for(alice).delete(reverse("lick-detail", args=[lick.id]))

    assert response.status_code == 204
