"""Optional startup checks for deployment diagnostics."""
import os


def has_frontend_url():
    return bool(os.getenv("FRONTEND_URL"))
