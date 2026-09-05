"""Tests for serve_media()'s HTTP Range support.

Regression coverage for: seeking on a file-backed track (MP3/PDF/image)
didn't move playback - it just snapped back to the start. Root cause was
Django's built-in django.views.static.serve() (previously wired up for
/media/) ignoring Range requests entirely and always returning the full
file with a plain 200, which browsers treat as "seeking not supported."
serve_media() is tested directly via RequestFactory against a real temp
file, bypassing the URL layer entirely so this doesn't depend on
settings.MEDIA_ROOT or urlconf reloading.
"""

import tempfile
from pathlib import Path

from django.http import Http404
from django.test import RequestFactory, SimpleTestCase

from django_project.media_views import serve_media


class ServeMediaRangeTests(SimpleTestCase):
    def setUp(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        self.document_root = Path(tmp_dir.name)
        self.content = bytes(range(256)) * 4  # 1024 distinct, orderable bytes
        (self.document_root / "song.mp3").write_bytes(self.content)
        self.factory = RequestFactory()

    def _get(self, range_header=None):
        headers = {"HTTP_RANGE": range_header} if range_header else {}
        request = self.factory.get("/media/song.mp3", **headers)
        return serve_media(request, "song.mp3", document_root=self.document_root)

    def test_full_file_without_range_header(self):
        response = self._get()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Accept-Ranges"], "bytes")
        self.assertEqual(b"".join(response.streaming_content), self.content)

    def test_partial_range_returns_206_with_requested_slice(self):
        response = self._get("bytes=100-199")
        self.assertEqual(response.status_code, 206)
        self.assertEqual(response["Content-Range"], f"bytes 100-199/{len(self.content)}")
        self.assertEqual(response["Content-Length"], "100")
        self.assertEqual(b"".join(response.streaming_content), self.content[100:200])

    def test_open_ended_range_returns_rest_of_file(self):
        start = len(self.content) - 50
        response = self._get(f"bytes={start}-")
        self.assertEqual(response.status_code, 206)
        self.assertEqual(
            response["Content-Range"], f"bytes {start}-{len(self.content) - 1}/{len(self.content)}"
        )
        self.assertEqual(b"".join(response.streaming_content), self.content[start:])

    def test_range_end_past_file_size_is_clamped(self):
        response = self._get(f"bytes=0-{len(self.content) + 500}")
        self.assertEqual(response.status_code, 206)
        self.assertEqual(
            response["Content-Range"], f"bytes 0-{len(self.content) - 1}/{len(self.content)}"
        )
        self.assertEqual(b"".join(response.streaming_content), self.content)

    def test_range_starting_past_file_size_returns_416(self):
        response = self._get(f"bytes={len(self.content) + 10}-")
        self.assertEqual(response.status_code, 416)
        self.assertEqual(response["Content-Range"], f"bytes */{len(self.content)}")

    def test_missing_file_returns_404(self):
        request = self.factory.get("/media/missing.mp3")
        with self.assertRaises(Http404):
            serve_media(request, "missing.mp3", document_root=self.document_root)

    def test_suffix_range_returns_last_bytes(self):
        response = self._get("bytes=-50")
        self.assertEqual(response.status_code, 206)
        self.assertEqual(response["Content-Range"], "bytes 974-1023/1024")
        self.assertEqual(b"".join(response.streaming_content), self.content[-50:])

    def test_suffix_larger_than_file_returns_whole_file(self):
        response = self._get("bytes=-2048")
        self.assertEqual(response.status_code, 206)
        self.assertEqual(b"".join(response.streaming_content), self.content)

    def test_zero_suffix_is_unsatisfiable(self):
        response = self._get("bytes=-0")
        self.assertEqual(response.status_code, 416)
        self.assertEqual(response["Content-Range"], "bytes */1024")

    def test_empty_range_is_ignored(self):
        response = self._get("bytes=-")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), self.content)

    def test_range_on_empty_file_is_unsatisfiable(self):
        (self.document_root / "song.mp3").write_bytes(b"")
        response = self._get("bytes=0-")
        self.assertEqual(response.status_code, 416)
        self.assertEqual(response["Content-Range"], "bytes */0")
