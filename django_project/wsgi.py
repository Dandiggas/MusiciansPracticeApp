"""
WSGI config for django_project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
import subprocess
import sys

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_project.settings")

# Run migrations on startup (safe for Railway where the start command can't be customized)
if os.getenv("DATABASE_URL"):
    print("Running migrations...", flush=True)
    subprocess.run(
        [sys.executable, "manage.py", "migrate", "--noinput"],
        check=True,
    )
    print("Migrations complete.", flush=True)

application = get_wsgi_application()
