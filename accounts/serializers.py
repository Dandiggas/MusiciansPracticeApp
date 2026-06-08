from rest_framework import serializers
from allauth.account.models import EmailAddress

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
