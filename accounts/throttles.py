from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class AuthIdentRateThrottle(SimpleRateThrottle):
    """Throttle unauthenticated auth endpoints by client IP."""

    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }

    def get_rate(self):
        return settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].get(self.scope)


class LoginRateThrottle(AuthIdentRateThrottle):
    scope = "auth_login"


class RegisterRateThrottle(AuthIdentRateThrottle):
    scope = "auth_register"


class PasswordResetRateThrottle(AuthIdentRateThrottle):
    scope = "auth_password_reset"


class EmailVerificationRateThrottle(AuthIdentRateThrottle):
    scope = "auth_email_verification"
