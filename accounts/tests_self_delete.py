from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from allauth.account.models import EmailAddress
from session.models import Session, Take, Track


class AccountSelfDeleteTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="player",
            email="player@example.com",
            password="pw123456",
        )
        EmailAddress.objects.create(
            user=self.user,
            email=self.user.email,
            verified=True,
            primary=True,
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_user_can_delete_own_account(self):
        response = self.client.delete("/api/v1/account/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertFalse(Token.objects.filter(pk=self.token.pk).exists())
        self.assertFalse(EmailAddress.objects.filter(user_id=self.user.pk).exists())

    def test_self_delete_removes_owned_media_files(self):
        from django.conf import settings
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as media_root:
            settings.MEDIA_ROOT = media_root
            practice_session = Session.objects.create(user=self.user, name="Delete me")
            track = Track.objects.create(
                session=practice_session,
                name="Uploaded track",
                source_type="mp3",
                file=SimpleUploadedFile("track.mp3", b"track-bytes"),
                position=0,
            )
            take = Take.objects.create(
                track=track,
                name="Recorded take",
                capture_mode="audio",
                file=SimpleUploadedFile("take.webm", b"take-bytes"),
            )
            track_path = track.file.path
            take_path = take.file.path

            response = self.client.delete("/api/v1/account/")

            self.assertEqual(response.status_code, 204)
            self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())
            self.assertFalse(Track.objects.filter(pk=track.pk).exists())
            self.assertFalse(Take.objects.filter(pk=take.pk).exists())
            import os

            self.assertFalse(os.path.exists(track_path))
            self.assertFalse(os.path.exists(take_path))

    def test_self_delete_requires_authentication(self):
        self.client.credentials()

        response = self.client.delete("/api/v1/account/")

        self.assertIn(response.status_code, [401, 403])
