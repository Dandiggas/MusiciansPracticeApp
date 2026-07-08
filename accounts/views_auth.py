import hashlib
import logging
import smtplib
from urllib.error import HTTPError, URLError

from django.core.cache import cache
from django.db import transaction
from dj_rest_auth.registration.views import RegisterView, ResendEmailVerificationView
from dj_rest_auth.views import PasswordResetConfirmView, PasswordResetView
from rest_framework import status
from rest_framework.response import Response

from .throttles import (
    EmailVerificationRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)


logger = logging.getLogger(__name__)
EMAIL_DELIVERY_EXCEPTIONS = (smtplib.SMTPException, HTTPError, URLError, OSError)


class ThrottledRegisterView(RegisterView):
    throttle_classes = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except EMAIL_DELIVERY_EXCEPTIONS:
            self._clear_confirmation_rate_limit(request.data.get("email"))
            logger.exception("Registration email delivery failed; account creation rolled back.")
            return Response(
                {
                    "detail": (
                        "We couldn't send the verification email, so no account was "
                        "created. Please try again in a moment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def perform_create(self, serializer):
        # dj-rest-auth creates the user before allauth sends the verification email.
        # If email delivery fails, keep the registration atomic so the user is not
        # left with a half-created account that blocks the next signup attempt.
        with transaction.atomic():
            return super().perform_create(serializer)

    def _clear_confirmation_rate_limit(self, email):
        if not email:
            return
        key_hash = hashlib.sha256(str(email).strip().lower().encode("utf8")).hexdigest()
        cache.delete(f"allauth:rl:confirm_email:{key_hash}")


class ThrottledResendEmailVerificationView(ResendEmailVerificationView):
    throttle_classes = [EmailVerificationRateThrottle]


class ThrottledPasswordResetView(PasswordResetView):
    throttle_classes = [PasswordResetRateThrottle]


class ThrottledPasswordResetConfirmView(PasswordResetConfirmView):
    throttle_classes = [PasswordResetRateThrottle]
