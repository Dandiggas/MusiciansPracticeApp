from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LickViewSet, SessionViewSet, TakeViewSet, TrackViewSet


router = DefaultRouter()
router.register(r"sessions", SessionViewSet, basename="session")
router.register(r"tracks", TrackViewSet, basename="track")
router.register(r"licks", LickViewSet, basename="lick")
router.register(r"takes", TakeViewSet, basename="take")

urlpatterns = [
    path("", include(router.urls)),
]
