from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient


User = get_user_model()


def throttled_rest_framework_settings(**rates):
    return {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
            **rates,
        },
    }


def create_verified_user(username="alice"):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pw123456",
    )
    EmailAddress.objects.create(
        user=user,
        email=user.email,
        verified=True,
        primary=True,
    )
    return user


class AuthRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_login_is_rate_limited(self):
        create_verified_user()
        rest_framework = throttled_rest_framework_settings(auth_login="2/minute")

        with override_settings(REST_FRAMEWORK=rest_framework):
            for _ in range(2):
                response = self.client.post(
                    "/api/v1/dj-rest-auth/login/",
                    {"username": "alice", "password": "pw123456"},
                    format="json",
                    REMOTE_ADDR="203.0.113.10",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)

            response = self.client.post(
                "/api/v1/dj-rest-auth/login/",
                {"username": "alice", "password": "pw123456"},
                format="json",
                REMOTE_ADDR="203.0.113.10",
            )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_register_is_rate_limited(self):
        rest_framework = throttled_rest_framework_settings(auth_register="2/minute")

        with override_settings(REST_FRAMEWORK=rest_framework):
            for index in range(2):
                response = self.client.post(
                    "/api/v1/dj-rest-auth/registration/",
                    {
                        "username": f"user{index}",
                        "email": f"user{index}@example.com",
                        "password1": "pw123456",
                        "password2": "pw123456",
                    },
                    format="json",
                    REMOTE_ADDR="203.0.113.20",
                )
                self.assertLess(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

            response = self.client.post(
                "/api/v1/dj-rest-auth/registration/",
                {
                    "username": "user3",
                    "email": "user3@example.com",
                    "password1": "pw123456",
                    "password2": "pw123456",
                },
                format="json",
                REMOTE_ADDR="203.0.113.20",
            )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_password_reset_is_rate_limited(self):
        create_verified_user()
        rest_framework = throttled_rest_framework_settings(auth_password_reset="2/minute")

        with override_settings(REST_FRAMEWORK=rest_framework):
            for _ in range(2):
                response = self.client.post(
                    "/api/v1/dj-rest-auth/password/reset/",
                    {"email": "alice@example.com"},
                    format="json",
                    REMOTE_ADDR="203.0.113.30",
                )
                self.assertLess(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

            response = self.client.post(
                "/api/v1/dj-rest-auth/password/reset/",
                {"email": "alice@example.com"},
                format="json",
                REMOTE_ADDR="203.0.113.30",
            )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_verify_and_login_is_rate_limited(self):
        rest_framework = throttled_rest_framework_settings(auth_email_verification="2/minute")

        with override_settings(REST_FRAMEWORK=rest_framework):
            for _ in range(2):
                response = self.client.post(
                    "/api/v1/dj-rest-auth/registration/verify-and-login/",
                    {"key": "not-a-key"},
                    format="json",
                    REMOTE_ADDR="203.0.113.40",
                )
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

            response = self.client.post(
                "/api/v1/dj-rest-auth/registration/verify-and-login/",
                {"key": "not-a-key"},
                format="json",
                REMOTE_ADDR="203.0.113.40",
            )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
