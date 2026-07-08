import json
from unittest.mock import Mock, patch

from django.core.mail import EmailMultiAlternatives
from django.test import TestCase

from django_project.email_backends import (
    ResendApiEmailBackend,
    SendGridApiEmailBackend,
)


class ResendApiEmailBackendTest(TestCase):
    @patch.dict("os.environ", {"RESEND_API_KEY": "test-key", "EMAIL_TIMEOUT": "7"})
    @patch("django_project.email_backends.urlopen")
    def test_sends_message_through_resend_api(self, mock_urlopen):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.status = 200
        mock_urlopen.return_value = response

        message = EmailMultiAlternatives(
            subject="Verify your email",
            body="Plain text body",
            from_email="The Shed <hello@intheshed.app>",
            to=["user@example.com"],
            reply_to=["hello@intheshed.app"],
        )
        message.attach_alternative("<p>HTML body</p>", "text/html")

        sent = ResendApiEmailBackend().send_messages([message])

        self.assertEqual(sent, 1)
        request = mock_urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.resend.com/emails")
        self.assertEqual(request.headers["Authorization"], "Bearer test-key")
        self.assertEqual(mock_urlopen.call_args.kwargs["timeout"], 7)

        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["from"], "The Shed <hello@intheshed.app>")
        self.assertEqual(payload["to"], ["user@example.com"])
        self.assertEqual(payload["subject"], "Verify your email")
        self.assertEqual(payload["text"], "Plain text body")
        self.assertEqual(payload["html"], "<p>HTML body</p>")
        self.assertEqual(payload["reply_to"], ["hello@intheshed.app"])

    @patch.dict("os.environ", {}, clear=False)
    @patch("django_project.email_backends.urlopen")
    def test_raises_without_api_key(self, mock_urlopen):
        import os

        os.environ.pop("RESEND_API_KEY", None)
        message = EmailMultiAlternatives(
            subject="x", body="y", from_email="a@b.com", to=["c@d.com"]
        )
        with self.assertRaises(ValueError):
            ResendApiEmailBackend().send_messages([message])
        mock_urlopen.assert_not_called()


class SendGridApiEmailBackendTest(TestCase):
    @patch.dict("os.environ", {"SENDGRID_API_KEY": "test-key", "EMAIL_TIMEOUT": "7"})
    @patch("django_project.email_backends.urlopen")
    def test_sends_message_through_sendgrid_api(self, mock_urlopen):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.status = 202
        mock_urlopen.return_value = response

        message = EmailMultiAlternatives(
            subject="Verify your email",
            body="Plain text body",
            from_email="The Shed <hello@theshed.app>",
            to=["user@example.com"],
        )
        message.attach_alternative("<p>HTML body</p>", "text/html")

        sent = SendGridApiEmailBackend().send_messages([message])

        self.assertEqual(sent, 1)
        request = mock_urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.sendgrid.com/v3/mail/send")
        self.assertEqual(request.headers["Authorization"], "Bearer test-key")
        self.assertEqual(mock_urlopen.call_args.kwargs["timeout"], 7)

        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["from"], {"email": "hello@theshed.app", "name": "The Shed"})
        self.assertEqual(
            payload["personalizations"], [{"to": [{"email": "user@example.com"}]}]
        )
        self.assertEqual(payload["subject"], "Verify your email")
        self.assertEqual(
            payload["content"],
            [
                {"type": "text/plain", "value": "Plain text body"},
                {"type": "text/html", "value": "<p>HTML body</p>"},
            ],
        )
