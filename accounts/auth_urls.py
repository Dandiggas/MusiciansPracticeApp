from django.urls import path, include
from dj_rest_auth.views import LoginView
from dj_rest_auth.registration.views import RegisterView
from .throttles import AuthRateThrottle


class ThrottledLoginView(LoginView):
    throttle_classes = [AuthRateThrottle]


class ThrottledRegisterView(RegisterView):
    throttle_classes = [AuthRateThrottle]


urlpatterns = [
    path("login/", ThrottledLoginView.as_view(), name="rest_login"),
    path("", include("dj_rest_auth.urls")),
]

registration_urlpatterns = [
    path("", ThrottledRegisterView.as_view(), name="rest_register"),
    path("", include("dj_rest_auth.registration.urls")),
]
