import os
from urllib.parse import urlparse

from allauth.account.adapter import DefaultAccountAdapter


def _origin_from_request(request):
    if request is None:
        return None

    origin = request.META.get("HTTP_ORIGIN")
    if origin:
        parsed = urlparse(origin)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"

    referer = request.META.get("HTTP_REFERER")
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"

    return None


class CustomAccountAdapter(DefaultAccountAdapter):
    """Routes email confirmation links to the Next.js frontend's
    /auth/verify/<key> page, which POSTs the key back to
    /api/v1/dj-rest-auth/registration/verify-and-login/ and handles
    auto-login on success.

    FRONTEND_URL env var wins. If it is not configured, derive the frontend
    origin from the proxied registration request before falling back to local
    development.
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        frontend_url = (
            os.getenv("FRONTEND_URL")
            or _origin_from_request(request)
            or "http://localhost:3000"
        ).rstrip("/")
        return f"{frontend_url}/auth/verify/{emailconfirmation.key}"
