from django.urls import path
from .views import (
    SessionList, SessionDetail, PracticeRecommendationView,
    TagList, TagDetail, StatsView, PracticeCalendarView,
    PracticeByInstrumentView, start_timer, stop_timer, get_active_timer,
    pause_timer, resume_timer,
    SheetMusicList, SheetMusicDetail, serve_sheet_music_file,
)


urlpatterns = [
    # Session endpoints
    path("", SessionList.as_view(), name="session_list"),
    path("<int:pk>/", SessionDetail.as_view(), name="session_detail"),
    path('recommendations/', PracticeRecommendationView.as_view(), name='practice-recommendation'),

    # Tag endpoints
    path('tags/', TagList.as_view(), name='tag-list'),
    path('tags/<int:pk>/', TagDetail.as_view(), name='tag-detail'),

    # Sheet music endpoints
    path('sheet-music/', SheetMusicList.as_view(), name='sheet-music-list'),
    path('sheet-music/<int:pk>/', SheetMusicDetail.as_view(), name='sheet-music-detail'),
    path('sheet-music/<int:pk>/file/', serve_sheet_music_file, name='sheet-music-file'),

    # Stats and analytics
    path('stats/', StatsView.as_view(), name='stats'),
    path('calendar/', PracticeCalendarView.as_view(), name='practice-calendar'),
    path('by-instrument/', PracticeByInstrumentView.as_view(), name='practice-by-instrument'),

    # Timer endpoints
    path('timer/start/', start_timer, name='start-timer'),
    path('timer/<int:pk>/stop/', stop_timer, name='stop-timer'),
    path('timer/<int:pk>/pause/', pause_timer, name='pause-timer'),
    path('timer/<int:pk>/resume/', resume_timer, name='resume-timer'),
    path('timer/active/', get_active_timer, name='active-timer'),
]
