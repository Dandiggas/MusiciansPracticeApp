import pytest
from django.contrib.auth import get_user_model

from session.models import Lick, Session, Take, Track


pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(username="alice", password="pw")


def test_session_belongs_to_user(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")

    assert practice_session.user == user
    assert practice_session.name == "Kevin Bond"
    assert practice_session.created_at is not None
    assert practice_session.updated_at is not None


def test_track_belongs_to_session_with_source_type(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")

    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        note="Work on the bridge voicing.",
        source_type="youtube",
        youtube_url="https://youtu.be/abc",
        position=0,
    )

    assert track.session == practice_session
    assert track.source_type == "youtube"
    assert track.note == "Work on the bridge voicing."


def test_lick_belongs_to_track(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )

    lick = Lick.objects.create(
        track=track,
        name="Intro run",
        start_seconds=10.0,
        end_seconds=15.0,
        position=0,
    )

    assert lick.track == track


def test_deleting_session_cascades_to_tracks_and_licks(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )
    Lick.objects.create(
        track=track,
        name="Intro run",
        start_seconds=0,
        end_seconds=1,
        position=0,
    )

    practice_session.delete()

    assert Track.objects.count() == 0
    assert Lick.objects.count() == 0


def test_deleting_track_cascades_to_licks(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Praise on Demand",
        source_type="mp3",
        position=0,
    )
    Lick.objects.create(
        track=track,
        name="Intro run",
        start_seconds=0,
        end_seconds=1,
        position=0,
    )

    track.delete()

    assert Lick.objects.count() == 0


def test_take_belongs_to_track(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )

    take = Take.objects.create(
        track=track,
        name="Intro attempt",
        capture_mode="video_audio",
        file="takes/intro-attempt.webm",
    )

    assert take.track == track
    assert take.capture_mode == "video_audio"


def test_deleting_track_cascades_to_takes(user):
    practice_session = Session.objects.create(user=user, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="youtube",
        youtube_url="https://youtu.be/example",
        position=0,
    )
    Take.objects.create(
        track=track,
        name="Intro attempt",
        capture_mode="video_audio",
        file="takes/intro-attempt.webm",
    )

    track.delete()

    assert Take.objects.count() == 0
