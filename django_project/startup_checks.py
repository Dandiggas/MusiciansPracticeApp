"""Fail-fast checks that run during Django settings finalization.

These exist to catch misconfigurations that would otherwise cause
silent production failures — e.g., FRONTEND_URL unset in prod would
make the CustomAccountAdapter emit confirmation links pointing at
http://localhost:3000, which users would see as broken links.
"""
import os


def check_frontend_url():
    """Require FRONTEND_URL in env when DEBUG is False. In DEBUG mode
    the CustomAccountAdapter falls back to http://localhost:3000, which
    is correct for local dev but a broken-link failure in prod."""
    from django.conf import settings
    from django.core.exceptions import ImproperlyConfigured

    if settings.DEBUG:
        return
    if not os.getenv("FRONTEND_URL"):
        raise ImproperlyConfigured(
            "FRONTEND_URL env var is required when DEBUG=False. "
            "Confirmation emails will send broken links otherwise."
        )
