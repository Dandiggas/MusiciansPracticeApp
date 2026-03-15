from django.urls import path
from .views import current_user_view, update_profile_view, logout_view


urlpatterns = [
    path('api/v1/current-user/', current_user_view, name='current-user'),
    path('api/v1/update-profile/', update_profile_view, name='update-profile'),
    path('api/v1/logout/', logout_view, name='logout'),
]


