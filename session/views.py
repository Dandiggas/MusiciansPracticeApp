from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from .models import Session, Tag
from .permissions import IsAdminOrOwner
from .serializers import SessionSerializer, TagSerializer
from django.db.models import Max, Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
import openai
import os

openai.api_key = os.environ.get('OPENAI_API_KEY')

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

    def post(self, request):
        user_id = request.data.get('user_id')
        skill_level = request.data.get('skill_level')
        instrument = request.data.get('instrument')
        goals = request.data.get('goals')

        if not user_id or not skill_level or not instrument or not goals:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        prompt = f"Generate a practice recommendation for a {skill_level} level {instrument} player who wants to focus on {goals}."

        try:
            response = openai.Completion.create(
                engine='text-davinci-002',
                prompt=prompt,
                max_tokens=100,
                n=1,
                stop=None,
                temperature=0.7,
            )
            recommendation = response.choices[0].text.strip()

            session_data = {
                'user': user.id,
                'instrument': instrument,
                'skill_level': skill_level,
                'goals': goals,
                'recommendation': recommendation,
            }

            serializer = SessionSerializer(data=session_data)
            if serializer.is_valid():
                session = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


# Timer Control Views
@api_view(['POST'])
@permission_classes([IsAdminOrOwner])
def start_timer(request):
    """Start a new practice session timer"""
    instrument = request.data.get('instrument')
    description = request.data.get('description', '')

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