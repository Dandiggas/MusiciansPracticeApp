import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SessionWorkbench } from "@/components/sessions/SessionWorkbench";
import { SessionDetail, Track } from "@/types/session";


jest.mock("@/components/sessions/SessionHeader", () => ({
  SessionHeader: () => <div data-testid="session-header" />,
}));

jest.mock("@/components/sessions/SessionPracticeTools", () => ({
  SessionPracticeTools: () => <div data-testid="session-practice-tools" />,
}));

jest.mock("@/components/sessions/TrackPane", () => ({
  TrackPane: ({ track }: { track: Track }) => (
    <div data-testid="track-pane">{track.name}</div>
  ),
}));

jest.mock("@/components/sessions/TrackList", () => ({
  TrackList: ({
    tracks,
    selectedTrackId,
    onSelectTrack,
  }: {
    tracks: Track[];
    selectedTrackId: number | null;
    onSelectTrack: (trackId: number) => void;
  }) => (
    <div>
      {tracks.map((track) => (
        <div key={track.id} data-track-row-id={track.id}>
          <button
            type="button"
            data-track-select-button
            data-selected={track.id === selectedTrackId}
            onClick={() => onSelectTrack(track.id)}
          >
            {track.name}
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/sessions/AddTrackForm", () => ({
  AddTrackForm: ({
    onTrackCreated,
    sessionId,
    insertPosition,
  }: {
    onTrackCreated: (track: Track) => void;
    sessionId: number;
    insertPosition: number;
  }) => (
    <button
      type="button"
      onClick={() =>
        onTrackCreated({
          id: 99,
          session: sessionId,
          name: "New Track",
          note: "",
          called_key: "",
          source_type: "youtube",
          youtube_url: "https://youtu.be/abcdefghijk",
          file: null,
          bpm: null,
          last_speed: null,
          position: insertPosition,
          licks: [],
          takes: [],
          created_at: "2026-05-13T11:00:00.000Z",
          updated_at: "2026-05-13T11:00:00.000Z",
        })
      }
    >
      Mock add track
    </button>
  ),
}));

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 1,
    session: 3,
    name: "Existing Track",
    note: "",
    called_key: "",
    source_type: "youtube",
    youtube_url: "https://youtu.be/4nqDHK_dtwE",
    file: null,
    bpm: null,
    last_speed: null,
    position: 0,
    licks: [],
    takes: [],
    created_at: "2026-05-13T10:00:00.000Z",
    updated_at: "2026-05-13T10:00:00.000Z",
    ...overrides,
  };
}

function buildSession(): SessionDetail {
  return {
    id: 3,
    name: "Kevin Bond",
    tracks: [buildTrack()],
    created_at: "2026-05-13T10:00:00.000Z",
    updated_at: "2026-05-13T10:00:00.000Z",
  };
}

describe("SessionWorkbench", () => {
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const scrolledElements: string[] = [];

  beforeEach(() => {
    scrolledElements.length = 0;

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: function scrollIntoView() {
        const marker =
          this.getAttribute("data-track-row-id") ||
          this.getAttribute("data-track-pane") ||
          this.tagName;
        scrolledElements.push(marker);
      },
    });

    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it("scrolls and focuses the newly created track row", async () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: "(max-width: 1279px)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const user = userEvent.setup();
    render(<SessionWorkbench session={buildSession()} />);

    await user.click(screen.getByRole("button", { name: "Mock add track" }));

    const newTrackButton = await screen.findByRole("button", { name: "New Track" });
    await waitFor(() => expect(scrolledElements).toContain("99"));
    expect(document.activeElement).toBe(newTrackButton);
  });

  it("scrolls the selected track pane into view on stacked layouts", async () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      media: "(max-width: 1279px)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const user = userEvent.setup();
    render(<SessionWorkbench session={buildSession()} />);

    await user.click(screen.getByRole("button", { name: "Mock add track" }));

    await waitFor(() =>
      expect(scrolledElements).toEqual(
        expect.arrayContaining(["99", "selected-track-pane"])
      )
    );
  });
});
