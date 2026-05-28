"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Circle,
  DownloadSimple,
  Microphone,
  PencilSimple,
  Square,
  Trash,
  VideoCamera,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTake, deleteTake, renameTake } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Take, TakeCaptureMode, Track } from "@/types/session";


type MediaDeviceOption = {
  deviceId: string;
  label: string;
};

const CAPTURE_LABELS: Record<TakeCaptureMode, string> = {
  audio: "Audio only",
  video: "Video only",
  video_audio: "Video + audio",
};

const MIME_CANDIDATES: Record<TakeCaptureMode, string[]> = {
  audio: [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ],
  video: [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ],
  video_audio: [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ],
};

function getSupportedMimeType(mode: TakeCaptureMode) {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  return MIME_CANDIDATES[mode].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function fileExtensionForMode(mode: TakeCaptureMode, mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }
  if (mode === "audio") {
    return "webm";
  }
  return "webm";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "take";
}

function buildDefaultTakeName(track: Track, count: number) {
  return `${track.name} take ${count}`;
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function fallbackDeviceLabel(kind: "audioinput" | "videoinput", index: number) {
  return kind === "audioinput" ? `Audio input ${index + 1}` : `Camera ${index + 1}`;
}

function captureIcon(mode: TakeCaptureMode) {
  if (mode === "audio") {
    return <Microphone size={16} weight="bold" />;
  }
  if (mode === "video") {
    return <Camera size={16} weight="bold" />;
  }
  return <VideoCamera size={16} weight="bold" />;
}

function takeFileUrl(take: Take) {
  return `/api/django/takes/${take.id}/file/`;
}

function TakeRow({
  active,
  onDelete,
  onRename,
  onSelect,
  take,
}: {
  active: boolean;
  onDelete: () => void;
  onRename: (name: string) => Promise<void>;
  onSelect: () => void;
  take: Take;
}) {
  const [draftName, setDraftName] = useState(take.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftName(take.name);
    setIsEditing(false);
    setError("");
  }, [take.id, take.name]);

  async function handleSave() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError("Take name is required.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onRename(trimmed);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename take.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3 transition-colors",
        active ? "border-primary/40 bg-primary/[0.08]" : "border-border/60 bg-card/60"
      )}
    >
      <div className="flex items-start gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
          {isEditing ? (
            <div>
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="h-10"
              />
              {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
            </div>
          ) : (
            <div>
              <p className="truncate font-semibold text-foreground">{take.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <span>{CAPTURE_LABELS[take.capture_mode]}</span>
                <span>{formatCreatedAt(take.created_at)}</span>
              </div>
            </div>
          )}
        </button>

        <div className="flex shrink-0 gap-2">
          {isEditing ? (
            <>
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                <PencilSimple size={14} weight="bold" />
                Rename
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash size={14} weight="bold" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TrackTakesPanelProps {
  mutateTrack: (updater: (track: Track) => Track) => void;
  track: Track;
}

export function TrackTakesPanel({ mutateTrack, track }: TrackTakesPanelProps) {
  const [mode, setMode] = useState<TakeCaptureMode>("video_audio");
  const [takeName, setTakeName] = useState(buildDefaultTakeName(track, track.takes.length + 1));
  const [selectedTakeId, setSelectedTakeId] = useState<number | null>(track.takes[0]?.id ?? null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceOption[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedVideoInputId, setSelectedVideoInputId] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingError, setRecordingError] = useState("");

  const livePreviewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const selectedTake = useMemo(
    () => track.takes.find((take) => take.id === selectedTakeId) ?? null,
    [selectedTakeId, track.takes]
  );

  useEffect(() => {
    setTakeName(buildDefaultTakeName(track, track.takes.length + 1));
    setSelectedTakeId(track.takes[0]?.id ?? null);
  }, [track.id]);

  useEffect(() => {
    setSelectedTakeId((current) => {
      if (current !== null && track.takes.some((take) => take.id === current)) {
        return current;
      }
      return track.takes[0]?.id ?? null;
    });
  }, [track.takes]);

  useEffect(() => {
    void loadDevices();
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  useEffect(() => {
    if (!isRecording || mode === "audio" || !livePreviewRef.current || !streamRef.current) {
      return;
    }

    const preview = livePreviewRef.current;
    preview.srcObject = streamRef.current;
    preview.muted = true;
    void preview.play().catch(() => {});
  }, [isRecording, mode]);

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const nextAudioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || fallbackDeviceLabel("audioinput", index),
        }));
      const nextVideoInputs = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || fallbackDeviceLabel("videoinput", index),
        }));

      setAudioInputs(nextAudioInputs);
      setVideoInputs(nextVideoInputs);
      setSelectedAudioInputId((current) => current || nextAudioInputs[0]?.deviceId || "");
      setSelectedVideoInputId((current) => current || nextVideoInputs[0]?.deviceId || "");
    } catch {
      setRecordingError("Could not read recording devices.");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((trackItem) => trackItem.stop());
    streamRef.current = null;
    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
  }

  function currentTakeName() {
    return takeName.trim() || buildDefaultTakeName(track, track.takes.length + 1);
  }

  function mediaConstraints() {
    const wantsAudio = mode !== "video";
    const wantsVideo = mode !== "audio";

    return {
      audio: wantsAudio
        ? selectedAudioInputId
          ? { deviceId: { exact: selectedAudioInputId } }
          : true
        : false,
      video: wantsVideo
        ? selectedVideoInputId
          ? { deviceId: { exact: selectedVideoInputId } }
          : true
        : false,
    };
  }

  async function uploadTake(blob: Blob, mimeType: string) {
    const name = currentTakeName();
    const extension = fileExtensionForMode(mode, mimeType || blob.type);
    const fileName = `${slugify(name)}.${extension}`;
    const formData = new FormData();
    formData.append("track", String(track.id));
    formData.append("name", name);
    formData.append("capture_mode", mode);
    formData.append("file", blob, fileName);

    setIsUploading(true);
    setRecordingError("");
    try {
      const created = await createTake(formData);
      mutateTrack((current) => ({
        ...current,
        takes: [created, ...current.takes],
      }));
      setSelectedTakeId(created.id);
      setTakeName(buildDefaultTakeName(track, track.takes.length + 2));
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : "Could not save take.");
    } finally {
      setIsUploading(false);
    }
  }

  async function startRecording() {
    setRecordingError("");
    setIsPreparing(true);

    try {
      if (
        typeof window === "undefined" ||
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        setRecordingError("Recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints());
      streamRef.current = stream;
      await loadDevices();

      if (mode !== "audio" && livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        livePreviewRef.current.muted = true;
        void livePreviewRef.current.play().catch(() => {});
      }

      const mimeType = getSupportedMimeType(mode);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const resolvedMimeType = recorder.mimeType || mimeType || "";
        const blob = new Blob(chunksRef.current, {
          type: resolvedMimeType || undefined,
        });
        recorderRef.current = null;
        setIsRecording(false);
        stopStream();

        if (blob.size > 0) {
          void uploadTake(blob, resolvedMimeType);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setRecordingError(
        mode === "audio"
          ? "Could not access the selected microphone or interface."
          : "Could not access the selected camera or audio input."
      );
      stopStream();
    } finally {
      setIsPreparing(false);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function handleRenameTake(takeId: number, name: string) {
    const updated = await renameTake(takeId, name);
    mutateTrack((current) => ({
      ...current,
      takes: current.takes.map((take) => (take.id === updated.id ? updated : take)),
    }));
  }

  async function handleDeleteTake(takeId: number) {
    const take = track.takes.find((item) => item.id === takeId);
    if (!take || !window.confirm(`Delete "${take.name}"?`)) {
      return;
    }

    try {
      await deleteTake(takeId);
      mutateTrack((current) => ({
        ...current,
        takes: current.takes.filter((item) => item.id !== takeId),
      }));
      if (selectedTakeId === takeId) {
        const remaining = track.takes.filter((item) => item.id !== takeId);
        setSelectedTakeId(remaining[0]?.id ?? null);
      }
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : "Could not delete take.");
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Recorded takes
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Record yourself against this track, save the take, and come back to it later.
          </p>
        </div>
        <div className="rounded-full bg-muted/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {track.takes.length} saved
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
            {isRecording && mode !== "audio" ? (
              <video
                ref={livePreviewRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full bg-black object-cover"
              />
            ) : selectedTake ? (
              selectedTake.capture_mode === "audio" ? (
                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/[0.12] p-3 text-primary">
                      <Microphone size={18} weight="bold" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedTake.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Audio take
                      </p>
                    </div>
                  </div>
                  <audio controls src={takeFileUrl(selectedTake)} className="w-full" />
                </div>
              ) : (
                <video
                  controls
                  playsInline
                  src={takeFileUrl(selectedTake)}
                  className="aspect-video w-full bg-black object-cover"
                />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_55%),linear-gradient(135deg,rgba(7,10,11,0.98),rgba(20,29,31,0.94))] px-6 text-center">
                <div>
                  <div className="mx-auto mb-4 w-fit rounded-full bg-primary/[0.14] p-4 text-primary">
                    {captureIcon(mode)}
                  </div>
                  <p className="font-semibold text-white">
                    No saved take selected
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Record a new take or pick one from the list to replay it here.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <label
                  htmlFor="take-name"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Take name
                </label>
                <Input
                  id="take-name"
                  value={takeName}
                  onChange={(event) => setTakeName(event.target.value)}
                  className="mt-2 h-11"
                  disabled={isPreparing || isRecording || isUploading}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={isPreparing || isRecording || isUploading}
                >
                  <Circle size={16} weight="fill" />
                  {isPreparing ? "Preparing..." : isUploading ? "Saving..." : "Record"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={stopRecording}
                  disabled={!isRecording}
                >
                  <Square size={16} weight="fill" />
                  Stop
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["audio", "video", "video_audio"] as TakeCaptureMode[]).map((captureMode) => (
                <Button
                  key={captureMode}
                  type="button"
                  variant={mode === captureMode ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setMode(captureMode)}
                  disabled={isPreparing || isRecording || isUploading}
                >
                  {captureIcon(captureMode)}
                  {CAPTURE_LABELS[captureMode]}
                </Button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {mode !== "video" ? (
                <div>
                  <label
                    htmlFor="take-audio-input"
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Audio input
                  </label>
                  <select
                    id="take-audio-input"
                    value={selectedAudioInputId}
                    onChange={(event) => setSelectedAudioInputId(event.target.value)}
                    disabled={isPreparing || isRecording || isUploading || audioInputs.length === 0}
                    className="border-input mt-2 flex h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {audioInputs.length === 0 ? (
                      <option value="">Default microphone</option>
                    ) : (
                      audioInputs.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : null}

              {mode !== "audio" ? (
                <div>
                  <label
                    htmlFor="take-video-input"
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Camera
                  </label>
                  <select
                    id="take-video-input"
                    value={selectedVideoInputId}
                    onChange={(event) => setSelectedVideoInputId(event.target.value)}
                    disabled={isPreparing || isRecording || isUploading || videoInputs.length === 0}
                    className="border-input mt-2 flex h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {videoInputs.length === 0 ? (
                      <option value="">Default camera</option>
                    ) : (
                      videoInputs.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : null}
            </div>

            {recordingError ? (
              <p className="mt-3 text-sm text-destructive">{recordingError}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Take library
            </p>
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadDevices()}>
              Refresh inputs
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {track.takes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                No takes yet. Record the first pass, name it, and it will stay attached to this track.
              </div>
            ) : (
              track.takes.map((take) => (
                <TakeRow
                  key={take.id}
                  take={take}
                  active={take.id === selectedTakeId}
                  onSelect={() => setSelectedTakeId(take.id)}
                  onRename={(name) => handleRenameTake(take.id, name)}
                  onDelete={() => void handleDeleteTake(take.id)}
                />
              ))
            )}
          </div>

          {selectedTake ? (
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Selected take
              </p>
              <p className="mt-2 font-semibold text-foreground">{selectedTake.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <span>{CAPTURE_LABELS[selectedTake.capture_mode]}</span>
                <span>{formatCreatedAt(selectedTake.created_at)}</span>
              </div>
              <div className="mt-4">
                <Button asChild type="button" size="sm" variant="secondary">
                  <a href={takeFileUrl(selectedTake)} download>
                    <DownloadSimple size={16} weight="bold" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
