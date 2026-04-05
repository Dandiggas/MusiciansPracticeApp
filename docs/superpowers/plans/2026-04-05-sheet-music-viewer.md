# Sheet Music PDF Viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PDF sheet music upload, storage, and viewing to The Shed — as an in-session collapsible widget, a standalone library page, and integrated into the Launch Pad project cards.

**Architecture:** New `SheetMusic` Django model with FileField storage, REST API for CRUD + bookmark, `react-pdf` viewer component shared between in-session widget and standalone page. Launch Pad projects reference sheet music by ID via localStorage (matching existing project persistence pattern).

**Tech Stack:** Django 5.1 + DRF (backend), Next.js 15 + React 19 + react-pdf + Tailwind (frontend), pikepdf (PDF validation), Railway volume (file storage)

**Spec:** `docs/superpowers/specs/2026-04-05-sheet-music-viewer-design.md`

---

## File Structure

### Backend (new/modified)

| File | Action | Responsibility |
|------|--------|----------------|
| `session/models.py` | Modify | Add `SheetMusic` model |
| `session/serializers.py` | Modify | Add `SheetMusicSerializer` |
| `session/views.py` | Modify | Add sheet music CRUD views + file serve view |
| `session/throttles.py` | Modify | Add `SheetMusicUploadThrottle` |
| `session/urls.py` | Modify | Add sheet-music endpoints |
| `django_project/settings.py` | Modify | Add `MEDIA_ROOT`, `MEDIA_URL` |
| `django_project/urls.py` | Modify | Add media file serving in development |
| `requirements.txt` | Modify | Add `pikepdf` |
| `session/tests.py` | Modify | Add sheet music model + API tests |

### Frontend (new/modified)

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/next-app/src/lib/sheet-music-api.ts` | Create | API client for sheet music CRUD |
| `frontend/next-app/src/lib/practice-session-store.ts` | Modify | Add `sheetMusicId` to `InstrumentProject` |
| `frontend/next-app/src/components/studio/SheetMusicWidget.tsx` | Create | Collapsible PDF viewer (shared between session + standalone) |
| `frontend/next-app/src/components/studio/SheetMusicPicker.tsx` | Create | Modal for picking from library / uploading new |
| `frontend/next-app/src/app/sheet-music/page.tsx` | Create | Library grid page |
| `frontend/next-app/src/app/sheet-music/[id]/page.tsx` | Create | Standalone viewer page |
| `frontend/next-app/src/components/studio/SessionSetupForm.tsx` | Modify | Add sheet music attach field |
| `frontend/next-app/src/app/practice-timer/page.tsx` | Modify | Integrate SheetMusicWidget in active session |
| `frontend/next-app/src/app/dashboard/page.tsx` | Modify | Show sheet music info on Launch Pad cards |
| `frontend/next-app/src/components/navigation/Header.tsx` | Modify | Add "Sheet Music" nav link |
| `frontend/next-app/src/components/navigation/MobileNav.tsx` | Modify | Add "Sheet Music" to mobile nav |
| `frontend/next-app/package.json` | Modify | Add `react-pdf` dependency |

---

## Task 1: Backend — SheetMusic Model + Migration

**Files:**
- Modify: `session/models.py`
- Modify: `requirements.txt`

- [ ] **Step 1: Add pikepdf to requirements.txt**

Add to the end of `requirements.txt`:

```
pikepdf>=9.0.0
```

- [ ] **Step 2: Install dependencies**

Run: `pip install -r requirements.txt`
Expected: Successful install including pikepdf

- [ ] **Step 3: Add SheetMusic model to session/models.py**

Add after the `Tag` model (after line 20) in `session/models.py`:

```python
import uuid


def sheet_music_upload_path(instance, filename):
    return f"sheet_music/{instance.user_id}/{uuid.uuid4()}.pdf"


class SheetMusic(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sheet_music",
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to=sheet_music_upload_path)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    page_count = models.PositiveSmallIntegerField()
    file_hash = models.CharField(max_length=64, help_text="SHA256 hash of file content")
    last_page_viewed = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [
            ("user", "title"),
            ("user", "file_hash"),
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.user})"
```

- [ ] **Step 4: Create and run the migration**

Run: `python manage.py makemigrations session && python manage.py migrate`
Expected: Migration created and applied successfully

- [ ] **Step 5: Commit**

```bash
git add session/models.py requirements.txt session/migrations/
git commit -m "feat: add SheetMusic model with file storage and dedup"
```

---

## Task 2: Backend — Django Settings for Media Files

**Files:**
- Modify: `django_project/settings.py`
- Modify: `django_project/urls.py`

- [ ] **Step 1: Add MEDIA_ROOT and MEDIA_URL to settings.py**

Add after the `STATIC_ROOT` line (after line 164 in `django_project/settings.py`):

```python
# Media files (user-uploaded content like sheet music PDFs)
MEDIA_URL = "/media/"
MEDIA_ROOT = os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))
```

- [ ] **Step 2: Add media serving in development to django_project/urls.py**

Add to `django_project/urls.py`:

```python
from django.conf import settings
from django.conf.urls.static import static

# At the end, after urlpatterns:
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

- [ ] **Step 3: Verify dev server starts**

Run: `python manage.py runserver --noreload 0.0.0.0:8000 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/stats/`
Expected: 401 or 403 (server running, auth required). Kill the server after.

- [ ] **Step 4: Commit**

```bash
git add django_project/settings.py django_project/urls.py
git commit -m "feat: configure MEDIA_ROOT and MEDIA_URL for file uploads"
```

---

## Task 3: Backend — SheetMusic Serializer + Upload Validation

**Files:**
- Modify: `session/serializers.py`

- [ ] **Step 1: Add SheetMusicSerializer to session/serializers.py**

Add at the end of `session/serializers.py`:

```python
import hashlib
import pikepdf

from .models import Session, Tag, SheetMusic


MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
MAX_PAGE_COUNT = 50
MAX_USER_STORAGE = 200 * 1024 * 1024  # 200 MB


class SheetMusicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SheetMusic
        fields = (
            "id",
            "title",
            "file",
            "file_size",
            "page_count",
            "file_hash",
            "last_page_viewed",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("file_size", "page_count", "file_hash", "created_at", "updated_at")

    def validate_file(self, value):
        if value.content_type != "application/pdf":
            raise serializers.ValidationError("Only PDF files are accepted.")
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size exceeds {MAX_FILE_SIZE // (1024 * 1024)} MB limit."
            )
        return value

    def validate(self, attrs):
        request = self.context["request"]
        uploaded_file = attrs.get("file")

        if uploaded_file:
            # Check page count
            try:
                uploaded_file.seek(0)
                pdf = pikepdf.open(uploaded_file)
                page_count = len(pdf.pages)
                pdf.close()
                uploaded_file.seek(0)
            except Exception:
                raise serializers.ValidationError({"file": "Could not read PDF. File may be corrupted."})

            if page_count > MAX_PAGE_COUNT:
                raise serializers.ValidationError(
                    {"file": f"PDF has {page_count} pages. Maximum is {MAX_PAGE_COUNT}."}
                )

            # Compute hash
            hasher = hashlib.sha256()
            uploaded_file.seek(0)
            for chunk in uploaded_file.chunks():
                hasher.update(chunk)
            file_hash = hasher.hexdigest()
            uploaded_file.seek(0)

            # Check for duplicate content
            existing = SheetMusic.objects.filter(user=request.user, file_hash=file_hash).first()
            if existing:
                raise serializers.ValidationError(
                    {"file": f"You already have this file uploaded as \"{existing.title}\" (ID: {existing.id})."}
                )

            # Check storage quota
            current_usage = (
                SheetMusic.objects.filter(user=request.user)
                .aggregate(total=models.Sum("file_size"))["total"]
                or 0
            )
            if current_usage + uploaded_file.size > MAX_USER_STORAGE:
                raise serializers.ValidationError(
                    {"file": "Storage quota exceeded (200 MB). Delete some files to make room."}
                )

            attrs["file_size"] = uploaded_file.size
            attrs["page_count"] = page_count
            attrs["file_hash"] = file_hash

        return attrs


class SheetMusicUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SheetMusic
        fields = ("title", "last_page_viewed")
```

- [ ] **Step 2: Update the import at the top of serializers.py**

Replace the existing import line:

```python
from .models import Session, Tag
```

with:

```python
from django.db import models
from .models import Session, Tag, SheetMusic
```

- [ ] **Step 3: Commit**

```bash
git add session/serializers.py
git commit -m "feat: add SheetMusic serializer with upload validation and dedup"
```

---

## Task 4: Backend — Sheet Music API Views

**Files:**
- Modify: `session/views.py`
- Modify: `session/throttles.py`
- Modify: `session/urls.py`

- [ ] **Step 1: Add upload throttle to session/throttles.py**

Add after the existing `RecommendationRateThrottle` class:

```python
class SheetMusicUploadThrottle(UserRateThrottle):
    scope = "sheet_music_upload"

    def get_rate(self):
        return os.getenv("SHEET_MUSIC_UPLOAD_RATE_LIMIT", "10/hour")
```

- [ ] **Step 2: Add sheet music views to session/views.py**

Add the following imports at the top of `session/views.py` (merge with existing imports):

```python
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from .models import Session, Tag, SheetMusic
from .serializers import SessionSerializer, TagSerializer, SheetMusicSerializer, SheetMusicUpdateSerializer
from .throttles import RecommendationRateThrottle, SheetMusicUploadThrottle
```

Add the following views at the end of `session/views.py` (before the timer control views):

```python
class SheetMusicList(generics.ListCreateAPIView):
    permission_classes = (IsAdminOrOwner,)
    serializer_class = SheetMusicSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_throttles(self):
        if self.request.method == "POST":
            return [SheetMusicUploadThrottle()]
        return []

    def get_queryset(self):
        return SheetMusic.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SheetMusicDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAdminOrOwner,)

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return SheetMusicUpdateSerializer
        return SheetMusicSerializer

    def get_queryset(self):
        return SheetMusic.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.file.delete(save=False)
        instance.delete()


@api_view(["GET"])
@permission_classes([IsAdminOrOwner])
def serve_sheet_music_file(request, pk):
    """Serve a sheet music PDF file (auth-protected)."""
    try:
        sheet = SheetMusic.objects.get(pk=pk, user=request.user)
    except SheetMusic.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    return FileResponse(sheet.file.open("rb"), content_type="application/pdf")
```

- [ ] **Step 3: Add URL routes to session/urls.py**

Add to the imports in `session/urls.py`:

```python
from .views import (
    SessionList, SessionDetail, PracticeRecommendationView,
    TagList, TagDetail, StatsView, PracticeCalendarView,
    PracticeByInstrumentView, start_timer, stop_timer, get_active_timer,
    pause_timer, resume_timer,
    SheetMusicList, SheetMusicDetail, serve_sheet_music_file,
)
```

Add to `urlpatterns` (after the tag endpoints):

```python
    # Sheet music endpoints
    path('sheet-music/', SheetMusicList.as_view(), name='sheet-music-list'),
    path('sheet-music/<int:pk>/', SheetMusicDetail.as_view(), name='sheet-music-detail'),
    path('sheet-music/<int:pk>/file/', serve_sheet_music_file, name='sheet-music-file'),
```

- [ ] **Step 4: Verify server starts and endpoints are registered**

Run: `python manage.py runserver --noreload 0.0.0.0:8000 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/sheet-music/`
Expected: 401 (auth required — endpoint exists). Kill the server after.

- [ ] **Step 5: Commit**

```bash
git add session/views.py session/throttles.py session/urls.py
git commit -m "feat: add sheet music API views with CRUD, file serving, and upload throttle"
```

---

## Task 5: Backend — Tests

**Files:**
- Modify: `session/tests.py`

- [ ] **Step 1: Add sheet music test helpers and model tests**

Add the following at the end of `session/tests.py`:

```python
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import SheetMusic
import pikepdf


def make_test_pdf(pages=3):
    """Create a minimal valid PDF with the given number of pages."""
    buf = BytesIO()
    pdf = pikepdf.new()
    for _ in range(pages):
        pdf.add_blank_page(page_size=(612, 792))
    pdf.save(buf)
    buf.seek(0)
    return buf


class SheetMusicModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="sheetuser", email="sheet@test.com", password="secret"
        )

    def test_sheet_music_creation(self):
        pdf_data = make_test_pdf(3)
        sheet = SheetMusic.objects.create(
            user=self.user,
            title="Test Sheet",
            file=SimpleUploadedFile("test.pdf", pdf_data.read(), content_type="application/pdf"),
            file_size=1024,
            page_count=3,
            file_hash="a" * 64,
        )
        self.assertEqual(sheet.title, "Test Sheet")
        self.assertEqual(sheet.page_count, 3)
        self.assertEqual(sheet.last_page_viewed, 1)
        self.assertEqual(sheet.user, self.user)

    def test_duplicate_title_rejected(self):
        pdf1 = make_test_pdf(1)
        pdf2 = make_test_pdf(1)
        SheetMusic.objects.create(
            user=self.user,
            title="Duplicate",
            file=SimpleUploadedFile("a.pdf", pdf1.read(), content_type="application/pdf"),
            file_size=500,
            page_count=1,
            file_hash="b" * 64,
        )
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            SheetMusic.objects.create(
                user=self.user,
                title="Duplicate",
                file=SimpleUploadedFile("b.pdf", pdf2.read(), content_type="application/pdf"),
                file_size=500,
                page_count=1,
                file_hash="c" * 64,
            )

    def test_duplicate_hash_rejected(self):
        pdf1 = make_test_pdf(1)
        pdf2 = make_test_pdf(1)
        SheetMusic.objects.create(
            user=self.user,
            title="Sheet A",
            file=SimpleUploadedFile("a.pdf", pdf1.read(), content_type="application/pdf"),
            file_size=500,
            page_count=1,
            file_hash="d" * 64,
        )
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            SheetMusic.objects.create(
                user=self.user,
                title="Sheet B",
                file=SimpleUploadedFile("b.pdf", pdf2.read(), content_type="application/pdf"),
                file_size=500,
                page_count=1,
                file_hash="d" * 64,
            )


class SheetMusicAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="apiuser", email="api@test.com", password="secret"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def _upload_pdf(self, title="Test Sheet", pages=3):
        pdf_data = make_test_pdf(pages)
        pdf_file = SimpleUploadedFile("test.pdf", pdf_data.read(), content_type="application/pdf")
        return self.client.post(
            reverse("sheet-music-list"),
            {"title": title, "file": pdf_file},
            format="multipart",
        )

    def test_upload_valid_pdf(self):
        response = self._upload_pdf()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Test Sheet")
        self.assertEqual(response.data["page_count"], 3)
        self.assertGreater(response.data["file_size"], 0)
        self.assertEqual(len(response.data["file_hash"]), 64)

    def test_upload_non_pdf_rejected(self):
        fake_file = SimpleUploadedFile("test.txt", b"not a pdf", content_type="text/plain")
        response = self.client.post(
            reverse("sheet-music-list"),
            {"title": "Bad File", "file": fake_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_too_many_pages_rejected(self):
        response = self._upload_pdf(title="Big PDF", pages=51)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_duplicate_content_rejected(self):
        pdf_bytes = make_test_pdf(2).read()
        file1 = SimpleUploadedFile("a.pdf", pdf_bytes, content_type="application/pdf")
        self.client.post(
            reverse("sheet-music-list"),
            {"title": "First", "file": file1},
            format="multipart",
        )
        file2 = SimpleUploadedFile("b.pdf", pdf_bytes, content_type="application/pdf")
        response = self.client.post(
            reverse("sheet-music-list"),
            {"title": "Second", "file": file2},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_sheet_music(self):
        self._upload_pdf(title="Sheet A")
        response = self.client.get(reverse("sheet-music-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Sheet A")

    def test_update_bookmark(self):
        upload_resp = self._upload_pdf()
        sheet_id = upload_resp.data["id"]
        response = self.client.patch(
            reverse("sheet-music-detail", args=[sheet_id]),
            {"last_page_viewed": 2},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["last_page_viewed"], 2)

    def test_delete_sheet_music(self):
        upload_resp = self._upload_pdf()
        sheet_id = upload_resp.data["id"]
        response = self.client.delete(reverse("sheet-music-detail", args=[sheet_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(SheetMusic.objects.count(), 0)

    def test_serve_file(self):
        upload_resp = self._upload_pdf()
        sheet_id = upload_resp.data["id"]
        response = self.client.get(reverse("sheet-music-file", args=[sheet_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")

    def test_other_user_cannot_access(self):
        upload_resp = self._upload_pdf()
        sheet_id = upload_resp.data["id"]

        other_user = get_user_model().objects.create_user(
            username="other", email="other@test.com", password="secret"
        )
        other_token = Token.objects.create(user=other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {other_token.key}")

        response = self.client.get(reverse("sheet-music-detail", args=[sheet_id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_rejected(self):
        self.client.credentials()
        response = self.client.get(reverse("sheet-music-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

- [ ] **Step 2: Run the tests**

Run: `python manage.py test session.tests.SheetMusicModelTests session.tests.SheetMusicAPITests -v 2`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add session/tests.py
git commit -m "test: add SheetMusic model and API tests"
```

---

## Task 6: Frontend — Install react-pdf + API Client

**Files:**
- Modify: `frontend/next-app/package.json`
- Create: `frontend/next-app/src/lib/sheet-music-api.ts`

- [ ] **Step 1: Install react-pdf**

Run from `frontend/next-app/`:

```bash
npm install react-pdf
```

- [ ] **Step 2: Create the sheet music API client**

Create `frontend/next-app/src/lib/sheet-music-api.ts`:

```typescript
import axios from "axios";

const apiBaseUrl =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    : "http://localhost:8000/api/v1";

function authHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Token ${token}` } : {};
}

export interface SheetMusicRecord {
  id: number;
  title: string;
  file: string;
  file_size: number;
  page_count: number;
  file_hash: string;
  last_page_viewed: number;
  created_at: string;
  updated_at: string;
}

export async function listSheetMusic(): Promise<SheetMusicRecord[]> {
  const res = await axios.get<SheetMusicRecord[]>(
    `${apiBaseUrl}/sheet-music/`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function getSheetMusic(id: number): Promise<SheetMusicRecord> {
  const res = await axios.get<SheetMusicRecord>(
    `${apiBaseUrl}/sheet-music/${id}/`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function uploadSheetMusic(
  title: string,
  file: File
): Promise<SheetMusicRecord> {
  const form = new FormData();
  form.append("title", title);
  form.append("file", file);
  const res = await axios.post<SheetMusicRecord>(
    `${apiBaseUrl}/sheet-music/`,
    form,
    { headers: { ...authHeaders(), "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

export async function updateSheetMusic(
  id: number,
  data: { title?: string; last_page_viewed?: number }
): Promise<SheetMusicRecord> {
  const res = await axios.patch<SheetMusicRecord>(
    `${apiBaseUrl}/sheet-music/${id}/`,
    data,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function deleteSheetMusic(id: number): Promise<void> {
  await axios.delete(`${apiBaseUrl}/sheet-music/${id}/`, {
    headers: authHeaders(),
  });
}

export function getSheetMusicFileUrl(id: number): string {
  return `${apiBaseUrl}/sheet-music/${id}/file/`;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/package.json frontend/next-app/package-lock.json frontend/next-app/src/lib/sheet-music-api.ts
git commit -m "feat: add react-pdf dependency and sheet music API client"
```

---

## Task 7: Frontend — Update InstrumentProject Type

**Files:**
- Modify: `frontend/next-app/src/lib/practice-session-store.ts`

- [ ] **Step 1: Add sheetMusicId to InstrumentProject**

In `frontend/next-app/src/lib/practice-session-store.ts`, update the `InstrumentProject` interface (line 117-127) to add the new field:

```typescript
export interface InstrumentProject {
  instrument: InstrumentName;
  songTitle: string;
  description: string;
  youtubeUrl: string;
  bpm: number;
  notes: string;
  mediaSource: StoredMediaSource;
  audioFileName: string | null;
  sheetMusicId: number | null;
  sheetMusicTitle: string | null;
  lastPracticedAt: string;
}
```

- [ ] **Step 2: Update saveProject calls in practice-timer/page.tsx**

In `frontend/next-app/src/app/practice-timer/page.tsx`, find the two `saveProject()` calls (around lines 365 and 453) and add the new fields:

```typescript
          sheetMusicId: sheetMusicId,
          sheetMusicTitle: sheetMusicTitle,
```

These reference new state variables that will be added in Task 11. For now, ensure the interface is correct. The `saveProject` calls will be completed in Task 11 when the full integration happens.

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/lib/practice-session-store.ts
git commit -m "feat: add sheetMusicId and sheetMusicTitle to InstrumentProject type"
```

---

## Task 8: Frontend — SheetMusicWidget Component

**Files:**
- Create: `frontend/next-app/src/components/studio/SheetMusicWidget.tsx`

- [ ] **Step 1: Create the SheetMusicWidget component**

Create `frontend/next-app/src/components/studio/SheetMusicWidget.tsx`:

```tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { updateSheetMusic, getSheetMusicFileUrl } from "@/lib/sheet-music-api";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface SheetMusicWidgetProps {
  sheetMusicId: number;
  title: string;
  pageCount: number;
  initialPage?: number;
  standalone?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDelete?: () => void;
}

export default function SheetMusicWidget({
  sheetMusicId,
  title,
  pageCount,
  initialPage = 1,
  standalone = false,
  onTitleChange,
  onDelete,
}: SheetMusicWidgetProps) {
  const [collapsed, setCollapsed] = useState(!standalone);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileUrl = getSheetMusicFileUrl(sheetMusicId);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Measure container width for fit-to-width rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [collapsed]);

  // Debounced bookmark save
  const saveBookmark = useCallback(
    (page: number) => {
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      bookmarkTimer.current = setTimeout(() => {
        updateSheetMusic(sheetMusicId, { last_page_viewed: page }).catch(
          () => {}
        );
      }, 1000);
    },
    [sheetMusicId]
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, pageCount));
      setCurrentPage(clamped);
      saveBookmark(clamped);
    },
    [pageCount, saveBookmark]
  );

  // Keyboard navigation
  useEffect(() => {
    if (collapsed) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPage(currentPage - 1);
      if (e.key === "ArrowRight") goToPage(currentPage + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [collapsed, currentPage, goToPage]);

  // Collapsed bar
  if (collapsed) {
    return (
      <div
        className="rounded-xl bg-card p-4 flex items-center justify-between cursor-pointer hover:bg-card/80 transition-colors"
        onClick={() => setCollapsed(false)}
      >
        <div className="flex items-center gap-3">
          <span className="text-primary text-lg">♩</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {pageCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            Resume at page {currentPage}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Expanded viewer
  return (
    <div className="rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-primary text-lg">♩</span>
          {standalone && onTitleChange ? (
            <input
              className="text-sm font-semibold text-foreground bg-transparent border-none outline-none focus:ring-1 focus:ring-ring rounded px-1"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <span className="text-xs text-foreground px-1.5 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          {/* Page nav */}
          <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <span className="text-xs text-foreground px-2">
              {currentPage} / {pageCount}
            </span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          {/* Bookmark */}
          <button
            className="text-primary bg-primary/10 rounded-lg p-1.5"
            title="Bookmarked"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
          </button>
          {/* Standalone: delete */}
          {standalone && onDelete && (
            <button
              onClick={onDelete}
              className="text-destructive text-xs font-semibold px-2 py-1 rounded-lg hover:bg-destructive/10"
            >
              Delete
            </button>
          )}
          {/* Collapse (not in standalone) */}
          {!standalone && (
            <button onClick={() => setCollapsed(true)}>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      {/* PDF content */}
      <div
        ref={containerRef}
        className="flex justify-center bg-muted/50 p-5 min-h-[400px] overflow-auto"
      >
        <Document
          file={fileUrl}
          options={{
            httpHeaders: token ? { Authorization: `Token ${token}` } : {},
          }}
          loading={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          }
          error={
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-sm text-destructive">Failed to load PDF</p>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            width={containerWidth > 0 ? containerWidth - 40 : undefined}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run from `frontend/next-app/`: `npx tsc --noEmit`
Expected: No errors related to SheetMusicWidget

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/components/studio/SheetMusicWidget.tsx
git commit -m "feat: add SheetMusicWidget component with PDF viewer, zoom, page nav, and bookmarking"
```

---

## Task 9: Frontend — SheetMusicPicker Component

**Files:**
- Create: `frontend/next-app/src/components/studio/SheetMusicPicker.tsx`

- [ ] **Step 1: Create the SheetMusicPicker modal component**

Create `frontend/next-app/src/components/studio/SheetMusicPicker.tsx`:

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText } from "lucide-react";
import {
  listSheetMusic,
  uploadSheetMusic,
  type SheetMusicRecord,
} from "@/lib/sheet-music-api";

interface SheetMusicPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sheet: SheetMusicRecord) => void;
}

export default function SheetMusicPicker({
  open,
  onClose,
  onSelect,
}: SheetMusicPickerProps) {
  const [sheets, setSheets] = useState<SheetMusicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    listSheetMusic()
      .then(setSheets)
      .catch(() => setError("Failed to load sheet music"))
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadTitle.trim()) return;

    setUploading(true);
    setError("");
    try {
      const sheet = await uploadSheetMusic(uploadTitle.trim(), file);
      onSelect(sheet);
      onClose();
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: Record<string, unknown> } }).response?.data
      ) {
        const data = (err as { response: { data: Record<string, string[]> } }).response.data;
        const msg = Object.values(data).flat().join(" ");
        setError(msg || "Upload failed");
      } else {
        setError("Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {showUpload ? "Upload Sheet Music" : "Select Sheet Music"}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3">{error}</p>
        )}

        {showUpload ? (
          <div className="space-y-4">
            <Input
              placeholder="Title (e.g. All of Me - Lead Sheet)"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="h-11 rounded-lg bg-secondary border border-border"
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadTitle.trim()}
                className="rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowUpload(false)}
                className="rounded-lg"
              >
                Back to Library
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={() => setShowUpload(true)}
              variant="secondary"
              className="w-full rounded-lg"
            >
              <Upload className="mr-2 h-4 w-4" /> Upload New PDF
            </Button>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : sheets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No sheet music yet. Upload your first PDF.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => {
                      onSelect(sheet);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
                  >
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {sheet.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.page_count} pages &middot;{" "}
                        {(sheet.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run from `frontend/next-app/`: `npx tsc --noEmit`
Expected: No errors related to SheetMusicPicker

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/components/studio/SheetMusicPicker.tsx
git commit -m "feat: add SheetMusicPicker modal for library selection and upload"
```

---

## Task 10: Frontend — Standalone /sheet-music Library Page

**Files:**
- Create: `frontend/next-app/src/app/sheet-music/page.tsx`

- [ ] **Step 1: Create the library page**

Create `frontend/next-app/src/app/sheet-music/page.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Search } from "lucide-react";
import {
  listSheetMusic,
  uploadSheetMusic,
  type SheetMusicRecord,
} from "@/lib/sheet-music-api";

const MAX_STORAGE = 200 * 1024 * 1024; // 200 MB

export default function SheetMusicPage() {
  const [sheets, setSheets] = useState<SheetMusicRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    listSheetMusic()
      .then(setSheets)
      .catch(() => setError("Failed to load sheet music"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const totalStorage = sheets.reduce((sum, s) => sum + s.file_size, 0);
  const storagePercent = Math.min((totalStorage / MAX_STORAGE) * 100, 100);

  const filtered = sheets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const title = file.name.replace(/\.pdf$/i, "");
      try {
        const sheet = await uploadSheetMusic(title, file);
        setSheets((prev) => [sheet, ...prev]);
      } catch {
        setError("Upload failed. Check file size and format.");
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Sheet Music
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                Your Library
              </h1>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sheets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9 rounded-lg bg-secondary border border-border w-48"
                />
              </div>
              <Button
                onClick={handleUpload}
                className="rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground"
              >
                <Upload className="mr-1.5 h-4 w-4" /> Upload PDF
              </Button>
            </div>
          </div>

          {/* Storage bar */}
          <div className="flex items-center justify-between rounded-lg bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Storage: {(totalStorage / (1024 * 1024)).toFixed(1)} MB / 200 MB
              </span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              {sheets.length} sheet{sheets.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Card grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">
                {sheets.length === 0
                  ? "No sheet music yet"
                  : "No results found"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {sheets.length === 0
                  ? "Upload your first PDF to get started."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => router.push(`/sheet-music/${sheet.id}`)}
                  className="group rounded-xl bg-card overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Preview area */}
                  <div className="bg-white p-4 flex items-center justify-center min-h-[120px]">
                    <FileText className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {sheet.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sheet.page_count} pages &middot;{" "}
                      {(sheet.file_size / 1024).toFixed(0)} KB
                      {sheet.last_page_viewed > 1 &&
                        ` · Bookmarked p.${sheet.last_page_viewed}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/next-app/src/app/sheet-music/page.tsx
git commit -m "feat: add standalone /sheet-music library page"
```

---

## Task 11: Frontend — Standalone /sheet-music/[id] Viewer Page

**Files:**
- Create: `frontend/next-app/src/app/sheet-music/[id]/page.tsx`

- [ ] **Step 1: Create the viewer page**

Create `frontend/next-app/src/app/sheet-music/[id]/page.tsx`:

```tsx
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SheetMusicWidget from "@/components/studio/SheetMusicWidget";
import {
  getSheetMusic,
  updateSheetMusic,
  deleteSheetMusic,
  type SheetMusicRecord,
} from "@/lib/sheet-music-api";

export default function SheetMusicViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sheet, setSheet] = useState<SheetMusicRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    getSheetMusic(Number(id))
      .then(setSheet)
      .catch(() => setError("Sheet music not found"))
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleTitleChange = async (newTitle: string) => {
    if (!sheet) return;
    setSheet({ ...sheet, title: newTitle });
    try {
      await updateSheetMusic(sheet.id, { title: newTitle });
    } catch {
      // Revert on error
      setSheet((prev) => prev);
    }
  };

  const handleDelete = async () => {
    if (!sheet || !confirm("Delete this sheet music? This cannot be undone.")) return;
    try {
      await deleteSheetMusic(sheet.id);
      router.push("/sheet-music");
    } catch {
      setError("Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Not found"}</p>
          <Button variant="secondary" onClick={() => router.push("/sheet-music")}>
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/sheet-music")}
            className="rounded-lg"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Library
          </Button>
          <SheetMusicWidget
            sheetMusicId={sheet.id}
            title={sheet.title}
            pageCount={sheet.page_count}
            initialPage={sheet.last_page_viewed}
            standalone
            onTitleChange={handleTitleChange}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/next-app/src/app/sheet-music/[id]/page.tsx
git commit -m "feat: add standalone /sheet-music/[id] viewer page"
```

---

## Task 12: Frontend — Navigation Update

**Files:**
- Modify: `frontend/next-app/src/components/navigation/Header.tsx`
- Modify: `frontend/next-app/src/components/navigation/MobileNav.tsx`

- [ ] **Step 1: Add Sheet Music to the navigation array in Header.tsx**

In `frontend/next-app/src/components/navigation/Header.tsx`, update the `navigation` array (line 14-19):

```typescript
  const navigation = [
    { name: "The Shed", href: "/dashboard" },
    { name: "Studio", href: "/practice-timer" },
    { name: "Sheet Music", href: "/sheet-music" },
    { name: "AI Tutor", href: "/recommendations" },
    { name: "Analytics", href: "/profilepage" },
  ];
```

- [ ] **Step 2: Add Sheet Music to MobileNav.tsx**

Read `MobileNav.tsx` and add a matching "Sheet Music" entry to its navigation links, following the same pattern as the existing entries.

- [ ] **Step 3: Verify it compiles and renders**

Run from `frontend/next-app/`: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/next-app/src/components/navigation/Header.tsx frontend/next-app/src/components/navigation/MobileNav.tsx
git commit -m "feat: add Sheet Music to navigation header and mobile nav"
```

---

## Task 13: Frontend — SessionSetupForm Sheet Music Field

**Files:**
- Modify: `frontend/next-app/src/components/studio/SessionSetupForm.tsx`

- [ ] **Step 1: Add sheet music props and field to SessionSetupForm**

Update the `SessionSetupFormProps` interface (line 12-30) to add:

```typescript
  sheetMusicId: number | null;
  sheetMusicTitle: string | null;
  onSheetMusicAttach: (id: number, title: string) => void;
  onSheetMusicDetach: () => void;
  onOpenSheetMusicPicker: () => void;
```

Add the following section after the Practice Source section (after line 167, before the error display), inside the `<div className="space-y-6">`:

```tsx
      {/* Sheet Music */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Sheet Music
        </p>
        {sheetMusicId && sheetMusicTitle ? (
          <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-primary">♩</span>
              <span className="text-sm font-semibold text-foreground">
                {sheetMusicTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={onSheetMusicDetach}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenSheetMusicPicker}
            className="rounded-lg"
          >
            Attach PDF
          </Button>
        )}
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/next-app/src/components/studio/SessionSetupForm.tsx
git commit -m "feat: add sheet music attach/detach field to SessionSetupForm"
```

---

## Task 14: Frontend — Integrate Sheet Music into Practice Timer

**Files:**
- Modify: `frontend/next-app/src/app/practice-timer/page.tsx`

- [ ] **Step 1: Add sheet music state and imports**

Add imports at the top of `practice-timer/page.tsx`:

```typescript
import SheetMusicWidget from "@/components/studio/SheetMusicWidget";
import SheetMusicPicker from "@/components/studio/SheetMusicPicker";
import { getSheetMusic, type SheetMusicRecord } from "@/lib/sheet-music-api";
```

Add state variables in the `PracticeTimerContent` component (after the existing media state around line 66):

```typescript
  // ─── Sheet music state ──────────────────────────────────────────────
  const [sheetMusicId, setSheetMusicId] = useState<number | null>(null);
  const [sheetMusicTitle, setSheetMusicTitle] = useState<string | null>(null);
  const [sheetMusicPageCount, setSheetMusicPageCount] = useState(0);
  const [sheetMusicInitialPage, setSheetMusicInitialPage] = useState(1);
  const [showSheetMusicPicker, setShowSheetMusicPicker] = useState(false);
```

- [ ] **Step 2: Load sheet music from project on instrument change**

In the section where project data is restored from localStorage (look for where `getProject` is called and fields like `youtubeUrl`, `bpm`, etc. are set from the project), add:

```typescript
      if (project.sheetMusicId) {
        setSheetMusicId(project.sheetMusicId);
        setSheetMusicTitle(project.sheetMusicTitle);
        getSheetMusic(project.sheetMusicId)
          .then((sm) => {
            setSheetMusicPageCount(sm.page_count);
            setSheetMusicInitialPage(sm.last_page_viewed);
          })
          .catch(() => {
            setSheetMusicId(null);
            setSheetMusicTitle(null);
          });
      } else {
        setSheetMusicId(null);
        setSheetMusicTitle(null);
      }
```

- [ ] **Step 3: Add sheetMusicId/sheetMusicTitle to saveProject calls**

Find the two `saveProject()` calls and add:

```typescript
          sheetMusicId: sheetMusicId,
          sheetMusicTitle: sheetMusicTitle,
```

- [ ] **Step 4: Pass sheet music props to SessionSetupForm**

Add these props to the `<SessionSetupForm>` component in the setup mode section:

```tsx
                sheetMusicId={sheetMusicId}
                sheetMusicTitle={sheetMusicTitle}
                onSheetMusicAttach={(id, title) => {
                  setSheetMusicId(id);
                  setSheetMusicTitle(title);
                }}
                onSheetMusicDetach={() => {
                  setSheetMusicId(null);
                  setSheetMusicTitle(null);
                }}
                onOpenSheetMusicPicker={() => setShowSheetMusicPicker(true)}
```

- [ ] **Step 5: Add SheetMusicWidget to the active session workspace**

In the active session render section, after the `PracticeMedia` + `MetronomeWidget` grid (around line 956) and before the tools row, add:

```tsx
            {/* Sheet music viewer */}
            {sheetMusicId && sheetMusicTitle && (
              <SheetMusicWidget
                sheetMusicId={sheetMusicId}
                title={sheetMusicTitle}
                pageCount={sheetMusicPageCount}
                initialPage={sheetMusicInitialPage}
              />
            )}
```

- [ ] **Step 6: Add SheetMusicPicker modal**

At the end of the component's return, before the final closing `</div>`, add:

```tsx
        <SheetMusicPicker
          open={showSheetMusicPicker}
          onClose={() => setShowSheetMusicPicker(false)}
          onSelect={(sheet) => {
            setSheetMusicId(sheet.id);
            setSheetMusicTitle(sheet.title);
            setSheetMusicPageCount(sheet.page_count);
            setSheetMusicInitialPage(sheet.last_page_viewed);
          }}
        />
```

- [ ] **Step 7: Verify it compiles**

Run from `frontend/next-app/`: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add frontend/next-app/src/app/practice-timer/page.tsx
git commit -m "feat: integrate sheet music widget and picker into practice timer"
```

---

## Task 15: Frontend — Launch Pad Card Sheet Music Display

**Files:**
- Modify: `frontend/next-app/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add sheet music info to the instrument card**

In `dashboard/page.tsx`, find the instrument card rendering (around line 309-329) where `project.songTitle`, `project.description`, and the relative date are displayed. Add after the description and before the relative date:

```tsx
                      {project.sheetMusicTitle && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="text-primary">♩</span>
                          {project.sheetMusicTitle}
                        </p>
                      )}
```

Also add media reference display. After `project.songTitle` and before `project.description`:

```tsx
                      {project.youtubeUrl && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.youtubeUrl}
                        </p>
                      )}
                      {project.mediaSource === "audio" && project.audioFileName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.audioFileName}
                        </p>
                      )}
```

- [ ] **Step 2: Verify it compiles**

Run from `frontend/next-app/`: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/app/dashboard/page.tsx
git commit -m "feat: show sheet music and media info on Launch Pad cards"
```

---

## Task 16: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Add to `.gitignore`:

```
# Superpowers brainstorming sessions
.superpowers/

# User-uploaded media files
media/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to .gitignore"
```

---

## Task 17: Manual Smoke Test

- [ ] **Step 1: Start backend**

Run: `python manage.py runserver`

- [ ] **Step 2: Start frontend**

Run from `frontend/next-app/`: `npm run dev`

- [ ] **Step 3: Test the full flow**

1. Log in to the app
2. Navigate to `/sheet-music` — should see empty library
3. Click "Upload PDF" — select a PDF file, verify it appears in the grid
4. Click the card — should navigate to `/sheet-music/[id]` with the full viewer
5. Navigate pages, verify bookmark saves
6. Go to `/practice-timer`, select an instrument
7. In setup form, click "Attach PDF" — picker modal should show the uploaded sheet
8. Select it, start session — sheet music widget should appear collapsed in workspace
9. Expand it, navigate pages
10. Stop session, return to dashboard — Launch Pad card should show the sheet music title
11. Click the instrument again — sheet music should auto-load from the project

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
