"""Range-aware media file serving.

Django's built-in django.views.static.serve() (what should_serve_local_media()
in storage.py wires up for /media/) does not support HTTP Range requests: it
always returns the entire file with a plain 200 response. Browsers seek
within <audio>/<video> elements by issuing a `Range: bytes=<offset>-` request
and expecting a 206 Partial Content response for just that slice. Without
Range support, dragging the seek bar on a file-backed track doesn't move
playback - the server just resends the whole file from byte 0, so the
browser treats the seek as unsupported and playback snaps back to the start.
This only affects file-backed tracks (MP3/PDF/image); YouTube tracks play
through YouTube's own player and never hit this route.

This view adds single-range support (the only kind real browsers send for
media seeking) on top of the same FileSystemStorage-backed files
django.views.static.serve() would otherwise serve.
"""

import mimetypes
import posixpath
import re
from pathlib import Path

from django.http import FileResponse, Http404, HttpResponse
from django.utils._os import safe_join
from django.views.static import was_modified_since


_RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


class _BoundedFile:
    """Wraps an open file handle so FileResponse only streams `length` bytes
    starting from wherever the handle is currently seeked to."""

    def __init__(self, file_handle, length):
        self._file = file_handle
        self._remaining = length

    def read(self, size=-1):
        if self._remaining <= 0:
            return b""
        if size < 0 or size > self._remaining:
            size = self._remaining
        data = self._file.read(size)
        self._remaining -= len(data)
        return data

    def close(self):
        self._file.close()


def serve_media(request, path, document_root=None):
    """Range-aware equivalent of django.views.static.serve()."""
    normalized_path = posixpath.normpath(path).lstrip("/")
    fullpath = Path(safe_join(document_root, normalized_path))

    if fullpath.is_dir() or not fullpath.exists():
        raise Http404(f"'{path}' does not exist")

    stat_result = fullpath.stat()
    if not was_modified_since(
        request.META.get("HTTP_IF_MODIFIED_SINCE"), stat_result.st_mtime
    ):
        return HttpResponse(status=304)

    content_type, _encoding = mimetypes.guess_type(str(fullpath))
    content_type = content_type or "application/octet-stream"
    file_size = stat_result.st_size

    range_match = _RANGE_RE.match(request.META.get("HTTP_RANGE", ""))
    if not range_match:
        response = FileResponse(fullpath.open("rb"), content_type=content_type)
        response["Accept-Ranges"] = "bytes"
        return response

    start_str, end_str = range_match.groups()
    start = int(start_str) if start_str else 0
    end = int(end_str) if end_str else file_size - 1
    end = min(end, file_size - 1)

    if file_size == 0 or start > end or start >= file_size:
        response = HttpResponse(status=416)
        response["Content-Range"] = f"bytes */{file_size}"
        return response

    length = end - start + 1
    file_handle = fullpath.open("rb")
    file_handle.seek(start)

    response = FileResponse(
        _BoundedFile(file_handle, length),
        content_type=content_type,
        status=206,
    )
    response["Content-Length"] = str(length)
    response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    response["Accept-Ranges"] = "bytes"
    return response
