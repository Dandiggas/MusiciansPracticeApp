from django.core import signing
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from allauth.account import app_settings as allauth_settings
from allauth.account.models import EmailAddress, EmailConfirmation, EmailConfirmationHMAC


def _resolve_confirmation(key):
    """Return (confirmation, email_address, already_verified, expired) tuple.

    Tries HMAC first (allauth 65.x default), then DB-stored fallback.
    Returns (None, None, False, False) if the key is completely unrecognisable.
    """
    # --- HMAC path ---
    # EmailConfirmationHMAC.from_key() only returns a result when verified=False.
    # We need to detect the already-verified case, so we decode the PK ourselves
    # and look up the EmailAddress regardless of its verified flag.
    try:
        max_age = 60 * 60 * 24 * allauth_settings.EMAIL_CONFIRMATION_EXPIRE_DAYS
        pk = signing.loads(key, max_age=max_age, salt=allauth_settings.SALT)
        try:
            email_address = EmailAddress.objects.get(pk=pk)
        except EmailAddress.DoesNotExist:
            return None, None, False, False
        if email_address.verified:
            return None, email_address, True, False
        confirmation = EmailConfirmationHMAC(email_address)
        return confirmation, email_address, False, False
    except signing.SignatureExpired:
        # HMAC key structurally valid but past max_age — treat as expired.
        # We can't easily return a proper 410 here without the PK, but for
        # HMAC keys allauth's key_expired() always returns False (stateless).
        # In practice the HMAC token IS the expiry mechanism; we surface 410.
        return None, None, False, True
    except signing.BadSignature:
        pass  # Not an HMAC key — fall through to DB path.

    # --- DB-stored path (legacy / compatibility) ---
    # Query all rows (not just all_valid()) so we can distinguish expired vs missing.
    confirmation = (
        EmailConfirmation.objects.select_related("email_address__user")
        .filter(key=key.lower())
        .first()
    )
    if confirmation is None:
        return None, None, False, False
    if confirmation.email_address.verified:
        return None, confirmation.email_address, True, False
    if confirmation.key_expired():
        return None, None, False, True
    return confirmation, confirmation.email_address, False, False


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_and_login_view(request):
    """Confirm an email-verification key AND issue an auth token in one
    round-trip. Used by the Next.js /auth/verify/<key> page to make
    "click link in email = logged in" a single click from the user's
    perspective, on any device.

    Response shape ({key, user}) mirrors /dj-rest-auth/login/ so the
    frontend uses identical token-storage code.

    Status codes:
      200 — confirmed, token issued
      404 — invalid or missing key
      409 — already verified (re-click of a spent HMAC)
      410 — key expired past ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS
    """
    key = request.data.get("key", "")
    if not key:
        return Response({"detail": "invalid_key"}, status=status.HTTP_404_NOT_FOUND)

    confirmation, email_address, already_verified, expired = _resolve_confirmation(key)

    if already_verified:
        return Response({"detail": "already_verified"}, status=status.HTTP_409_CONFLICT)

    if expired:
        return Response({"detail": "expired_key"}, status=status.HTTP_410_GONE)

    if confirmation is None:
        return Response({"detail": "invalid_key"}, status=status.HTTP_404_NOT_FOUND)

    confirmation.confirm(request)  # allauth flips verified=True and fires signals
    user = confirmation.email_address.user
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"key": token.key, "user": user.pk}, status=status.HTTP_200_OK
    )
