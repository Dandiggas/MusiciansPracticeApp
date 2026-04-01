#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting gunicorn..."
gunicorn django_project.wsgi:application --bind 0.0.0.0:${PORT:-8080}
