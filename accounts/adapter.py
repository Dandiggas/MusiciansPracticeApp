import os
from allauth.account.adapter import DefaultAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """Routes email confirmation links to the Next.js frontend's
    /auth/verify/<key> page, which POSTs the key back to
    /api/v1/dj-rest-auth/registration/verify-and-login/ and handles
    auto-login on success.

    FRONTEND_URL env var in prod; localhost fallback for dev.
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return f"{frontend_url}/auth/verify/{emailconfirmation.key}"
