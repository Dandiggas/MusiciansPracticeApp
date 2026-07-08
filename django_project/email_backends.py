import json
import os
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core.mail.backends.base import BaseEmailBackend


class _JsonApiEmailBackend(BaseEmailBackend):
    """Shared plumbing for providers with a Bearer-token JSON send API."""

    api_url = ""
    api_key_env = ""
    provider_name = ""

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent = 0
        for message in email_messages:
            if self._send(message):
                sent += 1
        return sent

    def _send(self, message):
        api_key = os.getenv(self.api_key_env)
        if not api_key:
            if self.fail_silently:
                return False
            raise ValueError(
                f"{self.api_key_env} is required for {self.provider_name} API email."
            )

        payload = self._build_payload(message)
        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        timeout = int(os.getenv("EMAIL_TIMEOUT", "10"))
        try:
            with urlopen(request, timeout=timeout) as response:
                return 200 <= response.status < 300
        except (HTTPError, URLError, OSError):
            if self.fail_silently:
                return False
            raise

    def _build_payload(self, message):  # pragma: no cover - overridden
        raise NotImplementedError

    def _html_alternative(self, message):
        for alternative, mimetype in getattr(message, "alternatives", []):
            if mimetype == "text/html":
                return alternative
        return None


class ResendApiEmailBackend(_JsonApiEmailBackend):
    """Django email backend that sends through Resend's HTTPS API."""

    api_url = "https://api.resend.com/emails"
    api_key_env = "RESEND_API_KEY"
    provider_name = "Resend"

    def _build_payload(self, message):
        payload = {
            "from": message.from_email,
            "to": list(message.to),
            "subject": message.subject,
            "text": message.body or "",
        }

        html = self._html_alternative(message)
        if html is not None:
            payload["html"] = html

        if getattr(message, "cc", None):
            payload["cc"] = list(message.cc)
        if getattr(message, "bcc", None):
            payload["bcc"] = list(message.bcc)
        if message.reply_to:
            payload["reply_to"] = list(message.reply_to)
        return payload


class SendGridApiEmailBackend(_JsonApiEmailBackend):
    """Django email backend that sends through SendGrid's HTTPS API."""

    api_url = "https://api.sendgrid.com/v3/mail/send"
    api_key_env = "SENDGRID_API_KEY"
    provider_name = "SendGrid"

    def _build_payload(self, message):
        from_email = self._address(message.from_email)
        recipients = [{"email": email} for email in message.to]
        content = [
            {
                "type": "text/plain",
                "value": message.body or "",
            }
        ]

        html = self._html_alternative(message)
        if html is not None:
            content.append({"type": "text/html", "value": html})

        payload = {
            "personalizations": [{"to": recipients}],
            "from": from_email,
            "subject": message.subject,
            "content": content,
        }

        if message.reply_to:
            payload["reply_to"] = self._address(message.reply_to[0])
        return payload

    def _address(self, value):
        name, email = parseaddr(value)
        address = {"email": email or value}
        if name:
            address["name"] = name
        return address
