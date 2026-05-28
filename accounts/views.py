from django.conf import settings
from dj_rest_auth.views import LoginView
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import CustomUserSerializer


class CookieLoginView(LoginView):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    serializer = CustomUserSerializer(request.user)
    return Response(serializer.data)


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
