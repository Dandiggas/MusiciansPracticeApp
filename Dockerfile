# Pull base image
FROM python:3.10.4-slim-bullseye

# Set environment variables
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /code

# Install dependencies
COPY ./requirements.txt .
RUN pip install -r requirements.txt

# Copy project
COPY . .

# Collect static files for production. This build-time placeholder only lets
# Django import production settings during collectstatic; runtime still requires
# the real FRONTEND_URL through Railway variables.
ARG FRONTEND_URL=http://localhost:3000
RUN FRONTEND_URL=$FRONTEND_URL python manage.py collectstatic --noinput

# Run migrations, then gunicorn, using the repo's Railway startup script.
CMD ["bash", "railway_start.sh"]
