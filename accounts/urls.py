from django.urls import path
from .views import current_user_view, logout_view
from .views_verify import verify_and_login_view


urlpatterns = [
    path('api/v1/current-user/', current_user_view, name='current-user'),
    path('api/v1/logout/', logout_view, name='logout'),
    path(
        'api/v1/dj-rest-auth/registration/verify-and-login/',
        verify_and_login_view,
        name='verify-and-login',
    ),
]


