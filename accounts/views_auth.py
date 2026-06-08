from dj_rest_auth.registration.views import RegisterView, ResendEmailVerificationView
from dj_rest_auth.views import PasswordResetConfirmView, PasswordResetView

from .throttles import (
    EmailVerificationRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)


class ThrottledRegisterView(RegisterView):
    throttle_classes = [RegisterRateThrottle]


class ThrottledResendEmailVerificationView(ResendEmailVerificationView):
    throttle_classes = [EmailVerificationRateThrottle]


class ThrottledPasswordResetView(PasswordResetView):
    throttle_classes = [PasswordResetRateThrottle]


class ThrottledPasswordResetConfirmView(PasswordResetConfirmView):
    throttle_classes = [PasswordResetRateThrottle]
