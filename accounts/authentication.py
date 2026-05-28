from django.conf import settings
from rest_framework.authentication import TokenAuthentication, get_authorization_header


class CookieTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        header = get_authorization_header(request)
        if header:
            return super().authenticate(request)

        token = request.COOKIES.get(settings.AUTH_TOKEN_COOKIE_NAME)
        if not token:
            return None

        return self.authenticate_credentials(token)
