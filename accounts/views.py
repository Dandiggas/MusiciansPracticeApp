from django.conf import settings
from django.contrib.auth import get_user_model
from dj_rest_auth.views import LoginView
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import AdminUserSerializer, CustomUserSerializer
from .throttles import LoginRateThrottle


User = get_user_model()


class CookieLoginView(LoginView):
    throttle_classes = [LoginRateThrottle]

    def get_response(self):
        response = super().get_response()

        if getattr(self, "token", None):
            response.set_cookie(
                settings.AUTH_TOKEN_COOKIE_NAME,
                self.token.key,
                httponly=settings.AUTH_TOKEN_COOKIE_HTTPONLY,
                samesite=settings.AUTH_TOKEN_COOKIE_SAMESITE,
                secure=settings.AUTH_TOKEN_COOKIE_SECURE,
                max_age=settings.AUTH_TOKEN_COOKIE_MAX_AGE,
                path=settings.AUTH_TOKEN_COOKIE_PATH,
            )

        return response


@extend_schema(responses=CustomUserSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    serializer = CustomUserSerializer(request.user)
    return Response(serializer.data)


@extend_schema(request=None, responses={200: None})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    auth_token = getattr(request.user, "auth_token", None)
    if auth_token is not None:
        auth_token.delete()

    response = Response(status=status.HTTP_200_OK)
    response.delete_cookie(
        settings.AUTH_TOKEN_COOKIE_NAME,
        path=settings.AUTH_TOKEN_COOKIE_PATH,
        samesite=settings.AUTH_TOKEN_COOKIE_SAMESITE,
    )
    return response


@extend_schema(request=None, responses={204: None})
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def account_detail_view(request):
    user = request.user
    user.delete()

    response = Response(status=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        settings.AUTH_TOKEN_COOKIE_NAME,
        path=settings.AUTH_TOKEN_COOKIE_PATH,
        samesite=settings.AUTH_TOKEN_COOKIE_SAMESITE,
    )
    return response


def _is_admin(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


@extend_schema(responses=AdminUserSerializer(many=True))
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_users_view(request):
    if not _is_admin(request.user):
        return Response(
            {"detail": "Admin access required."},
            status=status.HTTP_403_FORBIDDEN,
        )

    users = User.objects.order_by("-date_joined")
    serializer = AdminUserSerializer(users, many=True)
    return Response(serializer.data)


@extend_schema(request=None, responses={204: None})
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_user_detail_view(request, user_id):
    if not _is_admin(request.user):
        return Response(
            {"detail": "Admin access required."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.user.pk == user_id:
        return Response(
            {"detail": "You cannot delete your own account from the admin dashboard."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
