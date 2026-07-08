import os

from django.conf import settings
from django.core.checks import Tags, Warning, register


def has_frontend_url():
    return bool(os.getenv("FRONTEND_URL"))


def email_delivery_status(env=None):
    """Return non-secret email-delivery readiness details."""
    env = os.environ if env is None else env
    resend_api_key = env.get("RESEND_API_KEY", "")
    sendgrid_api_key = env.get("SENDGRID_API_KEY", "")
    email_backend = env.get(
        "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
    )
    default_from_email = env.get("DEFAULT_FROM_EMAIL", "hello@intheshed.app")
    frontend_url = env.get("FRONTEND_URL", "")

    uses_resend = bool(resend_api_key)
    uses_sendgrid = bool(sendgrid_api_key)
    uses_api_provider = uses_resend or uses_sendgrid

    if uses_resend:
        provider = "resend"
        effective_backend = "django_project.email_backends.ResendApiEmailBackend"
        email_host = "api.resend.com"
    elif uses_sendgrid:
        provider = "sendgrid"
        effective_backend = "django_project.email_backends.SendGridApiEmailBackend"
        email_host = "api.sendgrid.com"
    else:
        provider = "none"
        effective_backend = email_backend
        email_host = env.get("EMAIL_HOST", "")

    missing = []
    if not uses_api_provider:
        missing.append("RESEND_API_KEY")
    if not default_from_email:
        missing.append("DEFAULT_FROM_EMAIL")
    if not frontend_url:
        missing.append("FRONTEND_URL")

    return {
        "ready": uses_api_provider and not missing,
        "provider": provider,
        "uses_resend": uses_resend,
        "uses_sendgrid": uses_sendgrid,
        "email_backend": effective_backend,
        "email_host": email_host,
        "email_port": "443" if uses_api_provider else env.get("EMAIL_PORT", ""),
        "email_host_user": "(api token)" if uses_api_provider else env.get("EMAIL_HOST_USER", ""),
        "default_from_email": default_from_email,
        "frontend_url": frontend_url,
        "missing": missing,
    }


@register(Tags.security, deploy=True)
def production_environment_check(app_configs, **kwargs):
    warnings = []

    if not os.getenv("SECRET_KEY"):
        warnings.append(
            Warning(
                "SECRET_KEY is using the local fallback.",
                hint="Set a long random SECRET_KEY in the production environment.",
                id="practice.W001",
            )
        )

    if not os.getenv("DATABASE_URL"):
        warnings.append(
            Warning(
                "DATABASE_URL is not set.",
                hint="Use a durable PostgreSQL database for production deployments.",
                id="practice.W002",
            )
        )

    if not os.getenv("FRONTEND_URL"):
        warnings.append(
            Warning(
                "FRONTEND_URL is not set.",
                hint="Set FRONTEND_URL so account verification and password reset links point at the deployed frontend.",
                id="practice.W003",
            )
        )

    if not settings.AUTH_TOKEN_COOKIE_SECURE:
        warnings.append(
            Warning(
                "Authentication cookies are not marked secure.",
                hint="Set AUTH_TOKEN_COOKIE_SECURE=True in production.",
                id="practice.W004",
            )
        )

    if str(settings.MEDIA_ROOT).startswith(str(settings.BASE_DIR)):
        warnings.append(
            Warning(
                "MEDIA_ROOT points inside the application checkout.",
                hint="Use a persistent mounted volume or object storage for uploaded tracks and takes.",
                id="practice.W005",
            )
        )

    return warnings
