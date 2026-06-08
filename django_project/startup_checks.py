"""Optional startup checks for deployment diagnostics."""
import os


def has_frontend_url():
    return bool(os.getenv("FRONTEND_URL"))


def email_delivery_status(env=None):
    """Return non-secret email-delivery readiness details."""
    env = os.environ if env is None else env
    sendgrid_api_key = env.get("SENDGRID_API_KEY", "")
    email_backend = env.get(
        "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
    )
    default_from_email = env.get("DEFAULT_FROM_EMAIL", "hello@theshed.app")
    frontend_url = env.get("FRONTEND_URL", "")

    uses_sendgrid = bool(sendgrid_api_key)
    effective_backend = (
        "django_project.email_backends.SendGridApiEmailBackend"
        if uses_sendgrid
        else email_backend
    )
    missing = []
    if not sendgrid_api_key:
        missing.append("SENDGRID_API_KEY")
    if not default_from_email:
        missing.append("DEFAULT_FROM_EMAIL")
    if not frontend_url:
        missing.append("FRONTEND_URL")

    return {
        "ready": (
            not missing
            and effective_backend == "django_project.email_backends.SendGridApiEmailBackend"
        ),
        "uses_sendgrid": uses_sendgrid,
        "email_backend": effective_backend,
        "email_host": "api.sendgrid.com" if uses_sendgrid else env.get("EMAIL_HOST", ""),
        "email_port": "443" if uses_sendgrid else env.get("EMAIL_PORT", ""),
        "email_host_user": "(api token)" if uses_sendgrid else env.get("EMAIL_HOST_USER", ""),
        "default_from_email": default_from_email,
        "frontend_url": frontend_url,
        "missing": missing,
    }
