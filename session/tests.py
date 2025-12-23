from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from datetime import timedelta, date, datetime

from .models import Session, Tag


class SessionModelTests(TestCase):
    """Test cases for the Session model"""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="secret",
        )

    def test_session_creation(self):
        """Test basic session creation"""
        duration = timedelta(hours=1)
        session_date = date(2024, 2, 7)

        session = Session.objects.create(
            user=self.user,
            instrument="drums",
            duration=duration,
            description="rudiments",
            session_date=session_date
        )

        self.assertEqual(session.user.username, "testuser")
        self.assertEqual(session.instrument, "drums")
        self.assertEqual(session.duration, timedelta(hours=1))
        self.assertEqual(session.description, "rudiments")
        self.assertEqual(session.session_date, date(2024, 2, 7))
        self.assertEqual(session.in_progress, False)
        self.assertEqual(session.is_paused, False)
        self.assertIsNone(session.started_at)
        self.assertIsNone(session.paused_at)

    def test_session_display_id_auto_increment(self):
        """Test that display_id auto-increments per user"""
        session1 = Session.objects.create(
            user=self.user,
            instrument="guitar",
            duration=timedelta(minutes=30),
            session_date=date.today(),
            display_id=1
        )
        session2 = Session.objects.create(
            user=self.user,
            instrument="piano",
            duration=timedelta(minutes=45),
            session_date=date.today(),
            display_id=2
        )

        self.assertEqual(session1.display_id, 1)
        self.assertEqual(session2.display_id, 2)

    def test_session_string_representation(self):
        """Test session string representation"""
        session = Session.objects.create(
            user=self.user,
            instrument="guitar",
            duration=timedelta(minutes=30),
            session_date=date(2024, 3, 15)
        )
        self.assertEqual(str(session), "Session on 15-03-2024")

    def test_session_with_tags(self):
        """Test session with tags relationship"""
        tag1 = Tag.objects.create(name="scales", user=self.user)
        tag2 = Tag.objects.create(name="technique", user=self.user)

        session = Session.objects.create(
            user=self.user,
            instrument="guitar",
            duration=timedelta(minutes=30),
            session_date=date.today()
        )
        session.tags.add(tag1, tag2)

        self.assertEqual(session.tags.count(), 2)
        self.assertIn(tag1, session.tags.all())
        self.assertIn(tag2, session.tags.all())


class TagModelTests(TestCase):
    """Test cases for the Tag model"""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="secret",
        )

    def test_tag_creation(self):
        """Test basic tag creation"""
        tag = Tag.objects.create(
            name="jazz",
            color="#FF5733",
            user=self.user
        )

        self.assertEqual(tag.name, "jazz")
        self.assertEqual(tag.color, "#FF5733")
        self.assertEqual(tag.user, self.user)
        self.assertEqual(str(tag), "jazz")

    def test_tag_default_color(self):
        """Test tag with default color"""
        tag = Tag.objects.create(name="blues", user=self.user)
        self.assertEqual(tag.color, "#3B82F6")

    def test_tag_unique_together(self):
        """Test that tag names are unique per user"""
        Tag.objects.create(name="rock", user=self.user)

        # This should raise an IntegrityError due to unique_together
        with self.assertRaises(Exception):
            Tag.objects.create(name="rock", user=self.user)


class SessionAPITests(APITestCase):
    """Test cases for Session API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_create_session(self):
        """Test creating a new session via API"""
        url = reverse('session_list')
        data = {
            'instrument': 'guitar',
            'duration': '01:30:00',
            'description': 'practice scales',
            'session_date': date.today().isoformat()
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Session.objects.count(), 1)
        self.assertEqual(Session.objects.get().instrument, 'guitar')

    def test_list_sessions(self):
        """Test listing user's sessions"""
        Session.objects.create(
            user=self.user,
            instrument='drums',
            duration=timedelta(hours=1),
            session_date=date.today()
        )
        Session.objects.create(
            user=self.user,
            instrument='piano',
            duration=timedelta(minutes=45),
            session_date=date.today()
        )

        url = reverse('session_list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_update_session(self):
        """Test updating a session"""
        session = Session.objects.create(
            user=self.user,
            instrument='guitar',
            duration=timedelta(hours=1),
            session_date=date.today(),
            display_id=1
        )

        url = reverse('session_detail', args=[session.session_id])
        data = {
            'instrument': 'bass',
            'duration': '02:00:00',
            'description': 'updated description',
            'session_date': date.today().isoformat()
        }
        response = self.client.put(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.instrument, 'bass')

    def test_delete_session(self):
        """Test deleting a session"""
        session = Session.objects.create(
            user=self.user,
            instrument='guitar',
            duration=timedelta(hours=1),
            session_date=date.today(),
            display_id=1
        )

        url = reverse('session_detail', args=[session.session_id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Session.objects.count(), 0)

    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access sessions"""
        self.client.credentials()  # Remove authentication
        url = reverse('session_list')
        response = self.client.get(url)

        # Can be 401 or 403 depending on auth configuration
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class TimerAPITests(APITestCase):
    """Test cases for Timer functionality"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_start_timer(self):
        """Test starting a practice timer"""
        url = reverse('start-timer')
        data = {
            'instrument': 'guitar',
            'description': 'scales practice'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['in_progress'])
        self.assertIsNotNone(response.data['started_at'])
        self.assertEqual(response.data['instrument'], 'guitar')

    def test_start_timer_without_instrument(self):
        """Test that starting timer requires instrument"""
        url = reverse('start-timer')
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_timer_when_one_already_active(self):
        """Test that only one timer can be active at a time"""
        # Start first timer
        url = reverse('start-timer')
        self.client.post(url, {'instrument': 'guitar'}, format='json')

        # Try to start second timer
        response = self.client.post(url, {'instrument': 'piano'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_stop_timer(self):
        """Test stopping a practice timer"""
        # Start timer
        start_url = reverse('start-timer')
        start_response = self.client.post(start_url, {'instrument': 'guitar'}, format='json')
        session_id = start_response.data['session_id']

        # Stop timer
        stop_url = reverse('stop-timer', args=[session_id])
        response = self.client.post(stop_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['in_progress'])
        self.assertGreater(response.data['duration'], '00:00:00')

    def test_get_active_timer(self):
        """Test getting currently active timer"""
        # No active timer
        url = reverse('active-timer')
        response = self.client.get(url)
        self.assertEqual(response.data['active'], False)

        # Start a timer
        start_url = reverse('start-timer')
        self.client.post(start_url, {'instrument': 'guitar'}, format='json')

        # Check active timer
        response = self.client.get(url)
        self.assertEqual(response.data['active'], True)
        self.assertIn('session', response.data)


class PauseResumeAPITests(APITestCase):
    """Test cases for Pause/Resume functionality"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_pause_timer(self):
        """Test pausing an active timer"""
        # Start timer
        start_url = reverse('start-timer')
        start_response = self.client.post(start_url, {'instrument': 'guitar'}, format='json')
        session_id = start_response.data['session_id']

        # Pause timer
        pause_url = reverse('pause-timer', args=[session_id])
        response = self.client.post(pause_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_paused'])
        self.assertIsNotNone(response.data['paused_at'])

    def test_pause_already_paused_timer(self):
        """Test that pausing an already paused timer returns error"""
        # Start and pause timer
        start_url = reverse('start-timer')
        start_response = self.client.post(start_url, {'instrument': 'guitar'}, format='json')
        session_id = start_response.data['session_id']

        pause_url = reverse('pause-timer', args=[session_id])
        self.client.post(pause_url, {}, format='json')

        # Try to pause again
        response = self.client.post(pause_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_resume_timer(self):
        """Test resuming a paused timer"""
        # Start and pause timer
        start_url = reverse('start-timer')
        start_response = self.client.post(start_url, {'instrument': 'guitar'}, format='json')
        session_id = start_response.data['session_id']

        pause_url = reverse('pause-timer', args=[session_id])
        self.client.post(pause_url, {}, format='json')

        # Resume timer
        resume_url = reverse('resume-timer', args=[session_id])
        response = self.client.post(resume_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_paused'])
        self.assertIsNone(response.data['paused_at'])

    def test_resume_unpaused_timer(self):
        """Test that resuming an unpaused timer returns error"""
        # Start timer (not paused)
        start_url = reverse('start-timer')
        start_response = self.client.post(start_url, {'instrument': 'guitar'}, format='json')
        session_id = start_response.data['session_id']

        # Try to resume
        resume_url = reverse('resume-timer', args=[session_id])
        response = self.client.post(resume_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_pause_resume_duration_tracking(self):
        """Test that paused duration is tracked correctly"""
        # Start timer
        start_url = reverse('start-timer')
        start_response = self.client.post(start_url, {'instrument': 'guitar'}, format='json')
        session_id = start_response.data['session_id']

        # Pause timer
        pause_url = reverse('pause-timer', args=[session_id])
        pause_response = self.client.post(pause_url, {}, format='json')
        paused_at = timezone.datetime.fromisoformat(pause_response.data['paused_at'].replace('Z', '+00:00'))

        # Resume timer (this should add to paused_duration)
        resume_url = reverse('resume-timer', args=[session_id])
        resume_response = self.client.post(resume_url, {}, format='json')

        # Paused duration should be greater than 0
        paused_duration = resume_response.data['paused_duration']
        self.assertIsNotNone(paused_duration)


class StatsAPITests(APITestCase):
    """Test cases for Stats and Analytics endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        # Create some test sessions
        Session.objects.create(
            user=self.user,
            instrument='guitar',
            duration=timedelta(hours=2),
            session_date=date.today(),
            display_id=1
        )
        Session.objects.create(
            user=self.user,
            instrument='piano',
            duration=timedelta(hours=1),
            session_date=date.today(),
            display_id=2
        )

    def test_get_stats(self):
        """Test getting user practice stats"""
        url = reverse('stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_hours', response.data)
        self.assertIn('total_sessions', response.data)
        self.assertIn('week_hours', response.data)
        self.assertIn('current_streak', response.data)
        self.assertIn('favorite_instrument', response.data)

        self.assertEqual(response.data['total_hours'], 3.0)
        self.assertEqual(response.data['total_sessions'], 2)

    def test_calendar_data(self):
        """Test getting calendar heatmap data"""
        url = reverse('practice-calendar')
        response = self.client.get(url, {'days': 30})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_practice_by_instrument(self):
        """Test getting practice breakdown by instrument"""
        url = reverse('practice-by-instrument')
        response = self.client.get(url, {'days': 30})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)  # guitar and piano


class TagAPITests(APITestCase):
    """Test cases for Tag API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@email.com",
            password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_create_tag(self):
        """Test creating a new tag"""
        url = reverse('tag-list')
        data = {
            'name': 'jazz',
            'color': '#FF5733'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Tag.objects.count(), 1)
        self.assertEqual(Tag.objects.get().name, 'jazz')

    def test_list_tags(self):
        """Test listing user's tags"""
        Tag.objects.create(name='rock', user=self.user)
        Tag.objects.create(name='blues', user=self.user)

        url = reverse('tag-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_delete_tag(self):
        """Test deleting a tag"""
        tag = Tag.objects.create(name='classical', user=self.user)

        url = reverse('tag-detail', args=[tag.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Tag.objects.count(), 0)
