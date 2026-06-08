import json
from unittest.mock import Mock, patch

from django.core.mail import EmailMultiAlternatives
from django.test import TestCase

from django_project.email_backends import SendGridApiEmailBackend


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
