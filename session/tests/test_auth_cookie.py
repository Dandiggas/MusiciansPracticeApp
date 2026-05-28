import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


pytestmark = pytest.mark.django_db
User = get_user_model()


def test_login_sets_http_only_cookie():
    User.objects.create_user(username="alice", password="pw123456")
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
    User.objects.create_user(username="alice", password="pw123456")
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
