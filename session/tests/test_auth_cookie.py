import pytest
from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


pytestmark = pytest.mark.django_db
User = get_user_model()


def create_verified_user(username: str):
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


def test_login_sets_http_only_cookie():
    create_verified_user("alice")
    client = APIClient()

    response = client.post(
        "/api/v1/dj-rest-auth/login/",
        {"username": "alice", "password": "pw123456"},
        format="json",
    )

    assert response.status_code == 200
    assert settings.AUTH_TOKEN_COOKIE_NAME in response.cookies
    cookie = response.cookies[settings.AUTH_TOKEN_COOKIE_NAME]
    assert cookie.value
    assert cookie["httponly"]
    assert cookie["samesite"] == settings.AUTH_TOKEN_COOKIE_SAMESITE


def test_cookie_auth_works_on_protected_endpoint():
    create_verified_user("alice")
    client = APIClient()

    login_response = client.post(
        "/api/v1/dj-rest-auth/login/",
        {"username": "alice", "password": "pw123456"},
        format="json",
    )

    assert login_response.status_code == 200

    response = client.get("/api/v1/current-user/")

    assert response.status_code == 200
    assert response.json()["username"] == "alice"
