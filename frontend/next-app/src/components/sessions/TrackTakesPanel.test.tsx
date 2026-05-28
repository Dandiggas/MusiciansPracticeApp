import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TrackTakesPanel } from "@/components/sessions/TrackTakesPanel";
import { Track } from "@/types/session";


jest.mock("@/lib/api", () => ({
  createTake: jest.fn(),
  deleteTake: jest.fn(),
  renameTake: jest.fn(),
}));

class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true);

  mimeType = "video/webm";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions
  ) {}

  start = jest.fn();
  stop = jest.fn(() => {
    this.onstop?.();
  });
}

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 8,
    session: 3,
    name: "Pocket Study",
    note: "",
    source_type: "youtube",
    youtube_url: "https://youtu.be/abcdefghijk",
    file: null,
    bpm: null,
    last_speed: null,
    position: 0,
    licks: [],
    takes: [],
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    ...overrides,
  };
}

describe("TrackTakesPanel", () => {
  const originalMediaRecorder = global.MediaRecorder;
  const originalMediaDevices = navigator.mediaDevices;
  const originalPlay = HTMLMediaElement.prototype.play;
  const previewStreams = new WeakMap<HTMLMediaElement, MediaStream | null>();

  beforeEach(() => {
    const stream = {
      getTracks: () => [{ stop: jest.fn() }],
    } as unknown as MediaStream;

    Object.defineProperty(global, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: jest.fn().mockResolvedValue([
          { deviceId: "mic-1", kind: "audioinput", label: "Studio mic" },
          { deviceId: "cam-1", kind: "videoinput", label: "Webcam" },
        ]),
        getUserMedia: jest.fn().mockResolvedValue(stream),
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return previewStreams.get(this) ?? null;
      },
      set(value) {
        previewStreams.set(this, value as MediaStream | null);
      },
    });
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(global, "MediaRecorder", {
      configurable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
    HTMLMediaElement.prototype.play = originalPlay;
    jest.clearAllMocks();
  });

  it("attaches the live camera stream after the recording preview mounts", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrackTakesPanel track={buildTrack()} mutateTrack={jest.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /record/i }));

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    const preview = await waitFor(() => {
      const node = container.querySelector("video");
      expect(node).not.toBeNull();
      return node as HTMLVideoElement;
    });

    expect(preview.srcObject).toBe(
      await (navigator.mediaDevices.getUserMedia as jest.Mock).mock.results[0].value
    );
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
