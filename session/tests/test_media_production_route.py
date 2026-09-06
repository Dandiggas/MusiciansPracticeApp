"""Exercise the real URL configuration with production local storage."""
import importlib
import tempfile
from pathlib import Path

from django.test import TestCase, override_settings
from django.urls import clear_url_caches

import django_project.urls


class ProductionMediaRouteTests(TestCase):
    def test_production_local_files_and_ranges_are_reachable(self):
        with tempfile.TemporaryDirectory() as directory:
            content = bytes(range(256))
            for name in ("song.mp3", "chart.pdf", "chart.png", "take.webm"):
                Path(directory, name).write_bytes(content)
            try:
                with override_settings(DEBUG=False, USE_R2_MEDIA_STORAGE=False,
                                       MEDIA_ROOT=directory, SECURE_SSL_REDIRECT=False):
                    importlib.reload(django_project.urls)
                    clear_url_caches()
                    for name in ("song.mp3", "chart.pdf", "chart.png", "take.webm"):
                        with self.subTest(file=name):
                            response = self.client.get(f"/media/{name}")
                            self.assertEqual(response.status_code, 200)
                            self.assertEqual(b"".join(response.streaming_content), content)
                            response.close()
                            response = self.client.get(f"/media/{name}", HTTP_RANGE="bytes=32-63")
                            self.assertEqual(response.status_code, 206)
                            self.assertEqual(b"".join(response.streaming_content), content[32:64])
                            response.close()
                    self.assertEqual(self.client.get("/media/missing.mp3").status_code, 404)
            finally:
                importlib.reload(django_project.urls)
                clear_url_caches()

    @override_settings(DEBUG=False, USE_R2_MEDIA_STORAGE=True, SECURE_SSL_REDIRECT=False)
    def test_r2_does_not_expose_local_files(self):
        try:
            importlib.reload(django_project.urls)
            clear_url_caches()
            self.assertFalse(any(getattr(route, "default_args", {}).get("document_root")
                                 for route in django_project.urls.urlpatterns))
            self.assertEqual(self.client.get("/media/song.mp3").status_code, 404)
        finally:
            # Reload after leaving the override; registered cleanup runs after it.
            self.addCleanup(self.restore_urls)

    @staticmethod
    def restore_urls():
        importlib.reload(django_project.urls)
        clear_url_caches()
