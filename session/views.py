from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import Throttled
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from .models import Session, Tag, SheetMusic
from .permissions import IsAdminOrOwner
from .serializers import SessionSerializer, TagSerializer, SheetMusicSerializer, SheetMusicUpdateSerializer
from django.db.models import Max, Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from openai import OpenAI
import os
import json
import hashlib
import logging
from .throttles import RecommendationRateThrottle, SheetMusicUploadThrottle


logger = logging.getLogger(__name__)
RECOMMENDATION_GOALS_MAX_CHARS = int(os.getenv("OPENAI_RECOMMENDATIONS_GOALS_MAX_CHARS", "240"))
RECOMMENDATION_CACHE_TTL = int(os.getenv("OPENAI_RECOMMENDATIONS_CACHE_TTL_SECONDS", "3600"))
RECOMMENDATION_MAX_TOKENS = int(os.getenv("OPENAI_RECOMMENDATIONS_MAX_TOKENS", "350"))
RECOMMENDATION_TIMEOUT_SECONDS = float(os.getenv("OPENAI_RECOMMENDATIONS_TIMEOUT_SECONDS", "20"))

class SessionList(generics.ListCreateAPIView):
    permission_classes = (IsAdminOrOwner,)
    serializer_class = SessionSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Session.objects.all()
        return Session.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        max_display_id = Session.objects.filter(user=self.request.user).aggregate(Max('display_id'))['display_id__max'] or 0
        serializer.save(user=self.request.user, display_id=max_display_id + 1)

class SessionDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAdminOrOwner,)
    serializer_class = SessionSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Session.objects.all()
        return Session.objects.filter(user=self.request.user)

class PracticeRecommendationView(APIView):
    permission_classes = (IsAdminOrOwner,)
    throttle_classes = [RecommendationRateThrottle]

    def throttled(self, request, wait):
        retry_message = "Too many recommendation requests. Please wait a bit before generating another one."
        if wait is not None:
            retry_message = f"{retry_message} Try again in about {int(wait) + 1} seconds."
        raise Throttled(detail=retry_message, wait=wait)

    def _build_cache_key(self, user_id, instrument, skill_level, goals):
        payload = json.dumps(
            {
                "user_id": user_id,
                "instrument": instrument,
                "skill_level": skill_level,
                "goals": goals.strip().lower(),
            },
            sort_keys=True,
        )
        return f"recommendation:{hashlib.sha256(payload.encode('utf-8')).hexdigest()}"

    def post(self, request):
        skill_level = request.data.get('skill_level')
        instrument = request.data.get('instrument')
        goals = (request.data.get('goals') or '').strip()

        if not skill_level or not instrument or not goals:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        if len(goals) > RECOMMENDATION_GOALS_MAX_CHARS:
            return Response(
                {'error': f'Goals must be {RECOMMENDATION_GOALS_MAX_CHARS} characters or fewer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_skill_levels = [choice[0] for choice in Session.SKILL_LEVEL_CHOICES]
        if skill_level not in valid_skill_levels:
            return Response({'error': f'Invalid skill_level. Must be one of: {", ".join(valid_skill_levels)}'}, status=status.HTTP_400_BAD_REQUEST)

        valid_instruments = [choice[0] for choice in Session.INSTRUMENT_CHOICES]
        if instrument not in valid_instruments:
            return Response({'error': f'Invalid instrument. Must be one of: {", ".join(valid_instruments)}'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = self._build_cache_key(request.user.id, instrument, skill_level, goals)
        cached_recommendation = cache.get(cache_key)
        if cached_recommendation:
            logger.info(
                "Recommendation cache hit for user=%s instrument=%s skill_level=%s",
                request.user.id,
                instrument,
                skill_level,
            )
            return Response({
                'recommendation': cached_recommendation,
                'instrument': instrument,
                'skill_level': skill_level,
                'goals': goals,
                'cached': True,
            }, status=status.HTTP_200_OK)

        try:
            client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {'role': 'system', 'content': 'You are an experienced music teacher who provides detailed, actionable practice recommendations.'},
                    {'role': 'user', 'content': f'Generate a practice recommendation for a {skill_level} level {instrument} player who wants to focus on {goals}.'}
                ],
                max_tokens=RECOMMENDATION_MAX_TOKENS,
                temperature=0.7,
                timeout=RECOMMENDATION_TIMEOUT_SECONDS,
            )
            recommendation = response.choices[0].message.content.strip()
            cache.set(cache_key, recommendation, timeout=RECOMMENDATION_CACHE_TTL)
            logger.info(
                "Recommendation generated for user=%s instrument=%s skill_level=%s cached_for=%ss",
                request.user.id,
                instrument,
                skill_level,
                RECOMMENDATION_CACHE_TTL,
            )

            return Response({
                'recommendation': recommendation,
                'instrument': instrument,
                'skill_level': skill_level,
                'goals': goals,
                'cached': False,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(
                "Recommendation generation failed for user=%s instrument=%s skill_level=%s",
                request.user.id,
                instrument,
                skill_level,
            )
            return Response(
                {'error': 'Recommendation service is temporarily unavailable. Please try again shortly.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Tag CRUD Views
class TagList(generics.ListCreateAPIView):
    permission_classes = (IsAdminOrOwner,)
    serializer_class = TagSerializer

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TagDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAdminOrOwner,)
    serializer_class = TagSerializer

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)


# Stats View
class StatsView(APIView):
    permission_classes = (IsAdminOrOwner,)

    def get(self, request):
        user = request.user
        sessions = Session.objects.filter(user=user)

        # Total practice time
        total_duration = sessions.aggregate(
            total=Sum('duration')
        )['total'] or timedelta(0)

        # Total sessions
        total_sessions = sessions.count()

        # This week's hours
        week_start = timezone.now().date() - timedelta(days=timezone.now().weekday())
        week_sessions = sessions.filter(session_date__gte=week_start)
        week_duration = week_sessions.aggregate(
            total=Sum('duration')
        )['total'] or timedelta(0)

        # Current streak
        streak = self.calculate_streak(sessions)

        # Favorite instrument
        favorite_instrument = sessions.values('instrument').annotate(
            count=Count('instrument')
        ).order_by('-count').first()

        favorite = favorite_instrument['instrument'] if favorite_instrument else 'None'

        return Response({
            'total_hours': total_duration.total_seconds() / 3600,
            'total_sessions': total_sessions,
            'week_hours': week_duration.total_seconds() / 3600,
            'current_streak': streak,
            'favorite_instrument': favorite,
        })

    def calculate_streak(self, sessions):
        """Calculate current practice streak in days"""
        if not sessions.exists():
            return 0

        # Get unique practice dates sorted descending
        dates = list(sessions.values_list('session_date', flat=True).distinct().order_by('-session_date'))

        if not dates:
            return 0

        # Check if practiced today or yesterday
        today = timezone.now().date()
        if dates[0] < today - timedelta(days=1):
            return 0  # Streak broken

        streak = 0
        expected_date = dates[0]

        for date in dates:
            if date == expected_date:
                streak += 1
                expected_date = date - timedelta(days=1)
            else:
                break

        return streak


# Practice Calendar View (for heatmap)
class PracticeCalendarView(APIView):
    permission_classes = (IsAdminOrOwner,)

    def get(self, request):
        user = request.user
        days = int(request.query_params.get('days', 365))

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Get daily practice totals
        daily_data = Session.objects.filter(
            user=user,
            session_date__gte=start_date,
            session_date__lte=end_date
        ).values('session_date').annotate(
            total_duration=Sum('duration'),
            session_count=Count('session_id')
        ).order_by('session_date')

        # Format for frontend
        calendar_data = [
            {
                'date': item['session_date'].isoformat(),
                'duration_minutes': item['total_duration'].total_seconds() / 60,
                'session_count': item['session_count']
            }
            for item in daily_data
        ]

        return Response(calendar_data)


# Practice by Instrument View
class PracticeByInstrumentView(APIView):
    permission_classes = (IsAdminOrOwner,)

    def get(self, request):
        user = request.user
        days = int(request.query_params.get('days', 30))

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Get practice time by instrument
        instrument_data = Session.objects.filter(
            user=user,
            session_date__gte=start_date,
            session_date__lte=end_date
        ).values('instrument').annotate(
            total_duration=Sum('duration'),
            session_count=Count('session_id')
        ).order_by('-total_duration')

        # Format for frontend
        formatted_data = [
            {
                'instrument': item['instrument'],
                'duration_hours': item['total_duration'].total_seconds() / 3600,
                'session_count': item['session_count']
            }
            for item in instrument_data
        ]

        return Response(formatted_data)


class SheetMusicList(generics.ListCreateAPIView):
    permission_classes = (IsAdminOrOwner,)
    serializer_class = SheetMusicSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_throttles(self):
        if self.request.method == "POST":
            return [SheetMusicUploadThrottle()]
        return []

    def get_queryset(self):
        return SheetMusic.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SheetMusicDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAdminOrOwner,)

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return SheetMusicUpdateSerializer
        return SheetMusicSerializer

    def get_queryset(self):
        return SheetMusic.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.file.delete(save=False)
        instance.delete()


@api_view(["GET"])
@permission_classes([IsAdminOrOwner])
def serve_sheet_music_file(request, pk):
    """Serve a sheet music PDF file (auth-protected)."""
    try:
        sheet = SheetMusic.objects.get(pk=pk, user=request.user)
    except SheetMusic.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    return FileResponse(sheet.file.open("rb"), content_type="application/pdf")


# Timer Control Views
@api_view(['POST'])
@permission_classes([IsAdminOrOwner])
def start_timer(request):
    """Start a new practice session timer"""
    instrument = request.data.get('instrument')
    description = request.data.get('description', '')
    youtube_url = request.data.get('youtube_url', '')

    if not instrument:
        return Response({'error': 'Instrument is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if user already has a session in progress
    existing = Session.objects.filter(user=request.user, in_progress=True).first()
    if existing:
        return Response({'error': 'A session is already in progress'}, status=status.HTTP_400_BAD_REQUEST)

    # Create new session
    max_display_id = Session.objects.filter(user=request.user).aggregate(Max('display_id'))['display_id__max'] or 0

    session = Session.objects.create(
        user=request.user,
        instrument=instrument,
        description=description,
        youtube_url=youtube_url,
        session_date=timezone.now().date(),
        duration=timedelta(0),
        in_progress=True,
        started_at=timezone.now(),
        display_id=max_display_id + 1
    )

    serializer = SessionSerializer(session)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAdminOrOwner])
def stop_timer(request, pk):
    """Stop a practice session timer"""
    try:
        session = Session.objects.get(session_id=pk, user=request.user)
    except Session.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    if not session.in_progress:
        return Response({'error': 'Session is not in progress'}, status=status.HTTP_400_BAD_REQUEST)

    # Calculate total duration
    if session.started_at:
        elapsed = timezone.now() - session.started_at
        total_duration = elapsed - session.paused_duration
        session.duration = total_duration

    session.in_progress = False
    session.save()

    serializer = SessionSerializer(session)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminOrOwner])
def get_active_timer(request):
    """Get currently active timer session"""
    session = Session.objects.filter(user=request.user, in_progress=True).first()

    if not session:
        return Response({'active': False})

    serializer = SessionSerializer(session)
    return Response({'active': True, 'session': serializer.data})


@api_view(['POST'])
@permission_classes([IsAdminOrOwner])
def pause_timer(request, pk):
    """Pause a practice session timer"""
    try:
        session = Session.objects.get(session_id=pk, user=request.user)
    except Session.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    if not session.in_progress:
        return Response({'error': 'Session is not in progress'}, status=status.HTTP_400_BAD_REQUEST)

    if session.is_paused:
        return Response({'error': 'Session is already paused'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark as paused and record when
    session.is_paused = True
    session.paused_at = timezone.now()
    session.save()

    serializer = SessionSerializer(session)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminOrOwner])
def resume_timer(request, pk):
    """Resume a paused practice session timer"""
    try:
        session = Session.objects.get(session_id=pk, user=request.user)
    except Session.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    if not session.in_progress:
        return Response({'error': 'Session is not in progress'}, status=status.HTTP_400_BAD_REQUEST)

    if not session.is_paused:
        return Response({'error': 'Session is not paused'}, status=status.HTTP_400_BAD_REQUEST)

    # Calculate how long it was paused and add to cumulative paused duration
    if session.paused_at:
        pause_elapsed = timezone.now() - session.paused_at
        session.paused_duration += pause_elapsed

    # Resume the timer
    session.is_paused = False
    session.paused_at = None
    session.save()

    serializer = SessionSerializer(session)
    return Response(serializer.data)
