from django.urls import path
from .views import (
    account_detail_view,
    admin_user_detail_view,
    admin_users_view,
    current_user_view,
    logout_view,
)
from .views_verify import verify_and_login_view


urlpatterns = [
    path('api/v1/current-user/', current_user_view, name='current-user'),
    path('api/v1/logout/', logout_view, name='logout'),
    path('api/v1/account/', account_detail_view, name='account-detail'),
    path('api/v1/admin/users/', admin_users_view, name='admin-users'),
    path(
        'api/v1/admin/users/<int:user_id>/',
        admin_user_detail_view,
        name='admin-user-detail',
    ),
    path(
        'api/v1/dj-rest-auth/registration/verify-and-login/',
        verify_and_login_view,
        name='verify-and-login',
    ),
]
