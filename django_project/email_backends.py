import json
import os
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core.mail.backends.base import BaseEmailBackend


class SendGridApiEmailBackend(BaseEmailBackend):
    """Django email backend that sends through SendGrid's HTTPS API."""

    api_url = "https://api.sendgrid.com/v3/mail/send"

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent = 0
        for message in email_messages:
            if self._send(message):
                sent += 1
        return sent

    def _send(self, message):
        api_key = os.getenv("SENDGRID_API_KEY")
        if not api_key:
            if self.fail_silently:
                return False
            raise ValueError("SENDGRID_API_KEY is required for SendGrid API email.")

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

    def _build_payload(self, message):
        from_email = self._address(message.from_email)
        recipients = [{"email": email} for email in message.to]
        content = [
            {
                "type": "text/plain",
                "value": message.body or "",
            }
        ]

        for alternative, mimetype in getattr(message, "alternatives", []):
            if mimetype == "text/html":
                content.append({"type": "text/html", "value": alternative})

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
