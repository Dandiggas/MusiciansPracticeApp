"""Regression test for the /media/ route being reachable in production.

Uploaded MP3/PDF/image tracks are stored via local FileSystemStorage in any
environment that doesn't have R2 configured - including production. The
/media/ URL route used to only get added when DEBUG=True, which meant that in
production (DEBUG=False, R2 unset) uploaded files saved fine but every
/media/ URL 404'd, so tracks with files never played.

should_serve_local_media() is the pure boolean the urlconf branches on. It's
tested directly here (no Django settings override / urlconf reload) since
mutating and reloading the real ROOT_URLCONF module mid-test-run is fragile
and was flaky under Django's URL resolver caching. A plain function call is
enough to lock in the actual decision logic.
"""

from django.test import SimpleTestCase

from django_project.storage import should_serve_local_media


class ShouldServeLocalMediaTests(SimpleTestCase):
    def test_production_without_r2_serves_local_media(self):
        # DEBUG=False, R2 not configured: the bug this fix addresses. Local
        # storage is in use, so the route must be served or uploads 404.
        self.assertTrue(should_serve_local_media(debug=False, use_r2_media_storage=False))

    def test_debug_always_serves_local_media(self):
        self.assertTrue(should_serve_local_media(debug=True, use_r2_media_storage=False))
        self.assertTrue(should_serve_local_media(debug=True, use_r2_media_storage=True))

    def test_production_with_r2_does_not_serve_local_media(self):
        # R2 configured: files are served directly from R2, so Django doesn't
        # need to (and per the R2 setup, shouldn't) serve /media/ itself.
        self.assertFalse(should_serve_local_media(debug=False, use_r2_media_storage=True))
