"""Optional Cloudflare R2 (S3-compatible) media storage configuration.

The app stores uploaded media (MP3 tracks, PDF/image charts, recorded takes)
on local disk by default. On Railway that disk is not durable, so production
should point the default file storage at a private Cloudflare R2 bucket.

Convention: four env vars enable R2. With NONE of them set, behavior is
byte-identical to before (FileSystemStorage under MEDIA_ROOT):

    R2_BUCKET               bucket name, e.g. "theshed-media"
    R2_ACCESS_KEY_ID        R2 API token access key id
    R2_SECRET_ACCESS_KEY    R2 API token secret
    R2_ENDPOINT_URL         https://<account_id>.r2.cloudflarestorage.com

Optional:

    R2_SIGNED_URL_EXPIRE    seconds a presigned media URL stays valid
                            (default 43200 = 12h, covers long practice
                            sessions; max allowed by SigV4 is 7 days)
    R2_REGION               R2 region hint (default "auto")

The bucket must stay PRIVATE. Access is either streamed through the
auth-gated Django views (takes) or via short-lived presigned URLs that are
only handed out inside authenticated API responses (tracks).
"""

from django.core.exceptions import ImproperlyConfigured


R2_ENV_VARS = (
    "R2_BUCKET",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT_URL",
)


def r2_storage_options(env):
    """Build django-storages S3 backend OPTIONS for Cloudflare R2 from env.

    Returns None when no R2 variables are set (keep local-disk storage).
    Raises ImproperlyConfigured on a partial configuration so a typo'd
    Railway variable fails loudly instead of silently writing uploads to
    the ephemeral container disk.
    """
    values = {name: (env.get(name) or "").strip() for name in R2_ENV_VARS}

    if not any(values.values()):
        return None

    missing = [name for name in R2_ENV_VARS if not values[name]]
    if missing:
        raise ImproperlyConfigured(
            "Partial Cloudflare R2 configuration: set all of "
            f"{', '.join(R2_ENV_VARS)} (missing: {', '.join(missing)}) "
            "or unset them all to keep local media storage."
        )

    return {
        "bucket_name": values["R2_BUCKET"],
        "access_key": values["R2_ACCESS_KEY_ID"],
        "secret_key": values["R2_SECRET_ACCESS_KEY"],
        "endpoint_url": values["R2_ENDPOINT_URL"],
        "region_name": (env.get("R2_REGION") or "auto").strip() or "auto",
        # R2 does not support S3 ACLs; the bucket itself must stay private.
        "default_acl": None,
        # Private bucket: every URL the API hands out is presigned and
        # short-lived, so media never becomes publicly readable.
        "querystring_auth": True,
        "querystring_expire": int(env.get("R2_SIGNED_URL_EXPIRE") or 43200),
        # Match FileSystemStorage behavior: never overwrite on name clash.
        "file_overwrite": False,
        "signature_version": "s3v4",
    }


def should_serve_local_media(debug, use_r2_media_storage):
    """Whether Django itself should serve /media/ URLs.

    Uploaded tracks/charts are only reachable through Django's own /media/
    route when they're sitting on local disk (FileSystemStorage) - R2-backed
    uploads are served directly from R2 via presigned URLs instead. Local
    storage is used whenever R2 isn't configured, in ANY environment,
    including production. So this route needs to be served whenever local
    storage is in play, not just when DEBUG is on - otherwise files upload
    fine but every /media/ URL 404s.
    """
    return debug or not use_r2_media_storage
