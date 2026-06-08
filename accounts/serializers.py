import os

from django.conf import settings
from rest_framework import serializers
from allauth.account.models import EmailAddress
from allauth.account.utils import user_pk_to_url_str
from dj_rest_auth.serializers import PasswordResetSerializer

from .adapter import _origin_from_request
from .models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'name', 'email',)


class AdminUserSerializer(serializers.ModelSerializer):
    verified_emails = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "username",
            "name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "verified_emails",
        )

    def get_verified_emails(self, user):
        return [
            {"email": email, "verified": verified}
            for email, verified in EmailAddress.objects.filter(user=user)
            .order_by("email")
            .values_list("email", "verified")
        ]


def _frontend_url(request):
    return (
        getattr(settings, "FRONTEND_URL", "")
        or os.getenv("FRONTEND_URL", "")
        or _origin_from_request(request)
        or "http://localhost:3000"
    ).rstrip("/")


class FrontendPasswordResetSerializer(PasswordResetSerializer):
    def get_email_options(self):
        def url_generator(request, user, temp_key):
            uid = user_pk_to_url_str(user)
            return f"{_frontend_url(request)}/password-reset/confirm/{uid}/{temp_key}"

        return {"url_generator": url_generator}
