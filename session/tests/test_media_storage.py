"""Storage-backend selection and media-migration tests.

These run with NO R2 env vars set (the default for dev/CI) and never touch
the network: R2 behavior is exercised through the env→options helper and by
constructing the S3 backend without connecting.
"""

import os
from pathlib import Path

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import FileSystemStorage, default_storage
from django.core.management import call_command
from django.core.management.base import CommandError

from django_project.storage import R2_ENV_VARS, r2_storage_options
from session.models import Session, Take, Track


FULL_ENV = {
    "R2_BUCKET": "theshed-media",
    "R2_ACCESS_KEY_ID": "key-id",
    "R2_SECRET_ACCESS_KEY": "secret",
    "R2_ENDPOINT_URL": "https://abc123.r2.cloudflarestorage.com",
}

R2_ENV_IS_SET = any(os.environ.get(name) for name in R2_ENV_VARS)


# ─── env → storage options helper ────────────────────────────────────


def test_no_r2_env_keeps_local_storage():
    assert r2_storage_options({}) is None


def test_blank_r2_env_keeps_local_storage():
    env = {name: "" for name in R2_ENV_VARS}
    assert r2_storage_options(env) is None


def test_full_r2_env_builds_private_s3_options():
    options = r2_storage_options(dict(FULL_ENV))

    assert options["bucket_name"] == "theshed-media"
    assert options["access_key"] == "key-id"
    assert options["secret_key"] == "secret"
    assert options["endpoint_url"] == "https://abc123.r2.cloudflarestorage.com"
    assert options["region_name"] == "auto"
    # The bucket must stay private: no public ACL, presigned URLs only.
    assert options["default_acl"] is None
    assert options["querystring_auth"] is True
    assert options["querystring_expire"] == 43200
    assert options["file_overwrite"] is False


def test_partial_r2_env_fails_loudly():
    env = dict(FULL_ENV)
    del env["R2_SECRET_ACCESS_KEY"]

    with pytest.raises(ImproperlyConfigured, match="R2_SECRET_ACCESS_KEY"):
        r2_storage_options(env)


def test_signed_url_expiry_and_region_overrides():
    env = dict(FULL_ENV, R2_SIGNED_URL_EXPIRE="600", R2_REGION="wnam")
    options = r2_storage_options(env)

    assert options["querystring_expire"] == 600
    assert options["region_name"] == "wnam"


def test_s3_backend_accepts_generated_options():
    # Constructing the backend validates every option name without any
    # network access (boto3 clients are created lazily).
    from storages.backends.s3 import S3Storage

    storage = S3Storage(**r2_storage_options(dict(FULL_ENV)))

    assert storage.bucket_name == "theshed-media"
    assert storage.endpoint_url == "https://abc123.r2.cloudflarestorage.com"
    assert storage.querystring_auth is True


@pytest.mark.skipif(R2_ENV_IS_SET, reason="R2 env vars are set in this shell")
def test_default_storage_is_local_disk_without_r2_env():
    from django.conf import settings

    assert settings.USE_R2_MEDIA_STORAGE is False
    assert isinstance(default_storage, FileSystemStorage)


# ─── migrate_media_to_r2 management command ──────────────────────────


class DestinationStorage(FileSystemStorage):
    """Stands in for the R2 backend so the command is testable offline."""


@pytest.mark.django_db
def test_migrate_command_refuses_local_default_storage():
    with pytest.raises(CommandError, match="local filesystem"):
        call_command("migrate_media_to_r2")


@pytest.fixture
def track_with_local_file(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "local"
    local_file = Path(settings.MEDIA_ROOT) / "tracks" / "song.mp3"
    local_file.parent.mkdir(parents=True)
    local_file.write_bytes(b"mp3-bytes")

    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(username="alice", password="pw")
    practice_session = Session.objects.create(user=user, name="Kevin Bond")
    track = Track.objects.create(
        session=practice_session,
        name="Manifest",
        source_type="mp3",
        file="tracks/song.mp3",
        position=0,
    )
    take = Take.objects.create(
        track=track,
        name="Missing take",
        capture_mode="audio",
        file="takes/gone.webm",  # intentionally absent on disk
    )
    return track, take, tmp_path


@pytest.mark.django_db
def test_migrate_command_dry_run_writes_nothing(track_with_local_file, settings):
    _, _, tmp_path = track_with_local_file
    settings.STORAGES = {
        "default": {
            "BACKEND": "session.tests.test_media_storage.DestinationStorage",
            "OPTIONS": {"location": str(tmp_path / "dest")},
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

    call_command("migrate_media_to_r2", "--dry-run")

    assert not (tmp_path / "dest" / "tracks" / "song.mp3").exists()


@pytest.mark.django_db
def test_migrate_command_copies_verifies_and_is_idempotent(track_with_local_file, settings, capsys):
    _, _, tmp_path = track_with_local_file
    settings.STORAGES = {
        "default": {
            "BACKEND": "session.tests.test_media_storage.DestinationStorage",
            "OPTIONS": {"location": str(tmp_path / "dest")},
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

    call_command("migrate_media_to_r2")

    copied = tmp_path / "dest" / "tracks" / "song.mp3"
    assert copied.read_bytes() == b"mp3-bytes"
    output = capsys.readouterr()
    assert "copied: tracks/song.mp3" in output.out
    assert "MISSING local file for take" in output.err

    # Second run skips the already-copied file instead of duplicating it.
    call_command("migrate_media_to_r2")
    output = capsys.readouterr()
    assert "ok (already in R2): tracks/song.mp3" in output.out
    assert not list((tmp_path / "dest" / "tracks").glob("song_*"))
