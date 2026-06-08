from django.core.management.base import BaseCommand, CommandError

from django_project.startup_checks import email_delivery_status


class Command(BaseCommand):
    help = "Check whether production email verification delivery is configured."

    def handle(self, *args, **options):
        status = email_delivery_status()

        rows = [
            ("ready", "yes" if status["ready"] else "no"),
            ("uses_sendgrid", "yes" if status["uses_sendgrid"] else "no"),
            ("email_backend", status["email_backend"]),
            ("email_host", status["email_host"] or "(not set)"),
            ("email_port", status["email_port"] or "(not set)"),
            ("email_host_user", status["email_host_user"] or "(not set)"),
            ("default_from_email", status["default_from_email"] or "(not set)"),
            ("frontend_url", status["frontend_url"] or "(not set)"),
            (
                "missing",
                ", ".join(status["missing"]) if status["missing"] else "(none)",
            ),
        ]

        for key, value in rows:
            self.stdout.write(f"{key}: {value}")

        if not status["ready"]:
            raise CommandError(
                "Email delivery is not production-ready. Set the missing vars "
                "and confirm DEFAULT_FROM_EMAIL is verified in SendGrid."
            )
