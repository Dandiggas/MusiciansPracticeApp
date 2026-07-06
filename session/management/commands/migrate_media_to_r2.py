"""Copy existing local media files into the configured R2/S3 default storage.

Use once, after switching the Railway backend service to R2 (see
RAILWAY_DEPLOYMENT.md → "Durable media storage (Cloudflare R2)"): run it in
an environment that has BOTH the old files (the Railway volume / MEDIA_ROOT)
and the R2_* env vars set. Database rows are untouched — FileField values are
storage-relative names (e.g. "tracks/song.mp3") that carry over unchanged.

    python manage.py migrate_media_to_r2 --dry-run   # report only
    python manage.py migrate_media_to_r2             # copy + verify
"""

from django.conf import settings
from django.core.files import File
from django.core.files.storage import FileSystemStorage, default_storage
from django.core.management.base import BaseCommand, CommandError

from session.models import Take, Track


LOCAL_BACKEND = "django.core.files.storage.FileSystemStorage"


class Command(BaseCommand):
    help = (
        "Copy every Track/Take file from local MEDIA_ROOT into the configured "
        "default storage (Cloudflare R2), verify sizes, and report."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be copied without writing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if settings.STORAGES["default"]["BACKEND"] == LOCAL_BACKEND:
            raise CommandError(
                "Default file storage is still the local filesystem. "
                "Set R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and "
                "R2_ENDPOINT_URL before running this command."
            )

        source = FileSystemStorage(location=settings.MEDIA_ROOT)

        copied = skipped = missing = errors = 0

        for model, label in ((Track, "track"), (Take, "take")):
            queryset = (
                model.objects.exclude(file="")
                .exclude(file__isnull=True)
                .order_by("id")
            )
            for obj in queryset.iterator():
                name = obj.file.name

                if not source.exists(name):
                    missing += 1
                    self.stderr.write(
                        f"MISSING local file for {label} #{obj.pk}: {name}"
                    )
                    continue

                local_size = source.size(name)

                if default_storage.exists(name):
                    if default_storage.size(name) == local_size:
                        skipped += 1
                        self.stdout.write(f"ok (already in R2): {name}")
                    else:
                        errors += 1
                        self.stderr.write(
                            f"SIZE MISMATCH for {name}: local={local_size} "
                            f"remote={default_storage.size(name)} — not overwriting; "
                            "resolve manually."
                        )
                    continue

                if dry_run:
                    copied += 1
                    self.stdout.write(f"would copy: {name} ({local_size} bytes)")
                    continue

                with source.open(name, "rb") as handle:
                    saved_name = default_storage.save(name, File(handle))

                if saved_name != name:
                    errors += 1
                    self.stderr.write(
                        f"ERROR: {name} was saved as {saved_name}; the database "
                        "still references the original name. Investigate before "
                        "deleting local files."
                    )
                    continue

                remote_size = default_storage.size(name)
                if remote_size != local_size:
                    errors += 1
                    self.stderr.write(
                        f"VERIFY FAILED for {name}: local={local_size} "
                        f"remote={remote_size}"
                    )
                    continue

                copied += 1
                self.stdout.write(f"copied: {name} ({local_size} bytes)")

        verb = "would copy" if dry_run else "copied"
        summary = (
            f"{verb}: {copied}, already present: {skipped}, "
            f"missing locally: {missing}, errors: {errors}"
        )
        if errors:
            raise CommandError(summary)
        self.stdout.write(self.style.SUCCESS(summary))
