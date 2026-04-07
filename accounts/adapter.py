import os
from allauth.account.adapter import DefaultAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """Routes email confirmation links to the Next.js frontend."""

    def get_email_confirmation_url(self, request, emailconfirmation):
        frontend_url = os.getenv(
            "FRONTEND_URL", "http://localhost:3000"
        )
        return f"{frontend_url}/verify-email?key={emailconfirmation.key}"
