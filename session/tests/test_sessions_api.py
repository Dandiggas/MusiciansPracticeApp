import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from session.models import Session, Track


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


def test_list_returns_only_my_sessions(alice, bob, client_for):
    Session.objects.create(user=alice, name="Mine")
    Session.objects.create(user=bob, name="Theirs")

    response = client_for(alice).get(reverse("session-list"))

    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["Mine"]


def test_create_session(alice, client_for):
    response = client_for(alice).post(
        reverse("session-list"),
        {"name": "Kevin Bond"},
        format="json",
    )

    assert response.status_code == 201
    assert Session.objects.filter(user=alice, name="Kevin Bond").exists()


def test_detail_returns_nested_tracks(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        note="Watch the bass movement into the chorus.",
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

    response = client_for(alice).get(
        reverse("session-detail", args=[practice_session.id])
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Kevin Bond"
    assert len(body["tracks"]) == 1
    assert body["tracks"][0]["note"] == "Watch the bass movement into the chorus."
    assert len(body["tracks"][0]["licks"]) == 1
    assert len(body["tracks"][0]["takes"]) == 1


def test_other_users_session_returns_404(alice, bob, client_for):
    practice_session = Session.objects.create(user=bob, name="Theirs")

    response = client_for(alice).get(
        reverse("session-detail", args=[practice_session.id])
    )

    assert response.status_code == 404


def test_rename_session(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Old")

    response = client_for(alice).patch(
        reverse("session-detail", args=[practice_session.id]),
        {"name": "New"},
        format="json",
    )

    assert response.status_code == 200
    practice_session.refresh_from_db()
    assert practice_session.name == "New"


def test_delete_session_cascades_tracks(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Kevin Bond")
    Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )

    response = client_for(alice).delete(
        reverse("session-detail", args=[practice_session.id])
    )

    assert response.status_code == 204
    assert Track.objects.count() == 0


def test_reorder_tracks(alice, client_for):
    practice_session = Session.objects.create(user=alice, name="Kevin Bond")
    first = Track.objects.create(
        session=practice_session,
        name="A",
        source_type="mp3",
        position=0,
    )
    second = Track.objects.create(
        session=practice_session,
        name="B",
        source_type="mp3",
        position=1,
    )
    third = Track.objects.create(
        session=practice_session,
        name="C",
        source_type="mp3",
        position=2,
    )

    response = client_for(alice).post(
        reverse("session-reorder-tracks", args=[practice_session.id]),
        {"track_ids": [third.id, first.id, second.id]},
        format="json",
    )

    assert response.status_code == 200
    first.refresh_from_db()
    second.refresh_from_db()
    third.refresh_from_db()
    assert (third.position, first.position, second.position) == (0, 1, 2)
