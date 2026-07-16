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


def make_youtube_track(session, name, **kwargs):
    defaults = {
        "source_type": "youtube",
        "youtube_url": "https://www.youtube.com/watch?v=abc123",
        "note": "Watch the turnaround.",
        "bpm": 72,
        "last_speed": 0.75,
        "position": 0,
    }
    defaults.update(kwargs)
    return Track.objects.create(session=session, name=name, **defaults)


# ---------- preview ----------

def test_preview_requires_auth():
    response = APIClient().post(
        reverse("session-import-set-preview"), {"text": "Way Maker - Bb"}, format="json"
    )
    assert response.status_code in (401, 403)


def test_preview_parses_and_matches_own_history(alice, client_for):
    old = Session.objects.create(user=alice, name="Sunday 6 Jul")
    track = make_youtube_track(old, "Way Maker")
    track.licks.create(name="Bridge", start_seconds=60, end_seconds=90, position=0)

    response = client_for(alice).post(
        reverse("session-import-set-preview"),
        {"text": "1. Way Maker – Bb\n2. Brand New Song E"},
        format="json",
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 2

    first = items[0]
    assert first["title"] == "Way Maker"
    assert first["key"] == "Bb"
    assert first["match"]["track_id"] == track.id
    assert first["match"]["session_name"] == "Sunday 6 Jul"
    assert first["match"]["source_type"] == "youtube"
    assert first["match"]["lick_count"] == 1

    second = items[1]
    assert second["title"] == "Brand New Song"
    assert second["key"] == "E"
    assert second["match"] is None


def test_preview_fuzzy_matches_close_titles(alice, client_for):
    old = Session.objects.create(user=alice, name="Old")
    track = make_youtube_track(old, "The Way Maker (Leeland)")

    response = client_for(alice).post(
        reverse("session-import-set-preview"),
        {"text": "Way Maker - Bb"},
        format="json",
    )

    assert response.json()["items"][0]["match"]["track_id"] == track.id


def test_preview_never_matches_other_users_tracks(alice, bob, client_for):
    theirs = Session.objects.create(user=bob, name="Bob set")
    make_youtube_track(theirs, "Way Maker")

    response = client_for(alice).post(
        reverse("session-import-set-preview"),
        {"text": "Way Maker - Bb"},
        format="json",
    )

    assert response.json()["items"][0]["match"] is None


def test_preview_uses_most_recent_track_for_repeats(alice, client_for):
    older = Session.objects.create(user=alice, name="Older")
    newer = Session.objects.create(user=alice, name="Newer")
    make_youtube_track(older, "Way Maker", bpm=68)
    latest = make_youtube_track(newer, "Way Maker", bpm=74)

    response = client_for(alice).post(
        reverse("session-import-set-preview"),
        {"text": "Way Maker - Bb"},
        format="json",
    )

    assert response.json()["items"][0]["match"]["track_id"] == latest.id


def test_preview_rejects_blank_text(alice, client_for):
    response = client_for(alice).post(
        reverse("session-import-set-preview"), {"text": "   "}, format="json"
    )
    assert response.status_code == 400


# ---------- confirm ----------

def test_import_creates_session_with_carryover_and_new_tracks(alice, client_for):
    old = Session.objects.create(user=alice, name="Sunday 6 Jul")
    src = make_youtube_track(old, "Way Maker")
    src.licks.create(name="Bridge", start_seconds=60, end_seconds=90, last_speed=0.7, position=0)

    response = client_for(alice).post(
        reverse("session-import-set"),
        {
            "name": "Sunday 13 Jul",
            "items": [
                {"title": "Way Maker", "key": "Bb", "source_track_id": src.id},
                {"title": "Brand New Song", "key": "E", "source_track_id": None},
            ],
        },
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Sunday 13 Jul"
    assert len(body["tracks"]) == 2

    carried, fresh = body["tracks"]
    assert carried["name"] == "Way Maker"
    assert carried["called_key"] == "Bb"
    assert carried["source_type"] == "youtube"
    assert carried["youtube_url"] == src.youtube_url
    assert carried["note"] == src.note
    assert carried["bpm"] == src.bpm
    assert len(carried["licks"]) == 1
    assert carried["licks"][0]["name"] == "Bridge"
    assert carried["position"] == 0

    assert fresh["name"] == "Brand New Song"
    assert fresh["called_key"] == "E"
    assert fresh["source_type"] == "none"
    assert fresh["youtube_url"] == ""
    assert fresh["position"] == 1

    # The source track is untouched (copied, not moved)
    src.refresh_from_db()
    assert src.session_id == old.id
    assert src.licks.count() == 1


def test_import_file_track_carries_metadata_but_not_file(alice, client_for):
    old = Session.objects.create(user=alice, name="Old")
    src = Track.objects.create(
        session=old,
        name="Same God",
        source_type="mp3",
        file="tracks/same-god.mp3",
        note="Half-time feel.",
        bpm=140,
        position=0,
    )

    response = client_for(alice).post(
        reverse("session-import-set"),
        {
            "name": "Sunday 13 Jul",
            "items": [{"title": "Same God", "key": "C#m", "source_track_id": src.id}],
        },
        format="json",
    )

    assert response.status_code == 201
    track = response.json()["tracks"][0]
    # File is never shared (delete signals would nuke the original's audio)
    assert track["source_type"] == "none"
    assert track["file"] is None
    assert track["note"] == "Half-time feel."
    assert track["bpm"] == 140
    assert track["called_key"] == "C#m"


def test_import_rejects_other_users_source_track(alice, bob, client_for):
    theirs = Session.objects.create(user=bob, name="Bob set")
    bobs_track = make_youtube_track(theirs, "Way Maker")

    response = client_for(alice).post(
        reverse("session-import-set"),
        {
            "name": "Sneaky",
            "items": [{"title": "Way Maker", "key": "Bb", "source_track_id": bobs_track.id}],
        },
        format="json",
    )

    assert response.status_code == 400
    assert Session.objects.filter(user=alice).count() == 0


def test_import_rejects_empty_items(alice, client_for):
    response = client_for(alice).post(
        reverse("session-import-set"),
        {"name": "Sunday", "items": []},
        format="json",
    )
    assert response.status_code == 400


def test_import_rejects_blank_name(alice, client_for):
    response = client_for(alice).post(
        reverse("session-import-set"),
        {"name": "  ", "items": [{"title": "Way Maker", "key": "Bb"}]},
        format="json",
    )
    assert response.status_code == 400


def test_import_rejects_bad_key(alice, client_for):
    response = client_for(alice).post(
        reverse("session-import-set"),
        {"name": "Sunday", "items": [{"title": "Way Maker", "key": "H#"}]},
        format="json",
    )
    assert response.status_code == 400


def test_import_requires_auth():
    response = APIClient().post(
        reverse("session-import-set"),
        {"name": "Sunday", "items": [{"title": "Way Maker"}]},
        format="json",
    )
    assert response.status_code in (401, 403)
