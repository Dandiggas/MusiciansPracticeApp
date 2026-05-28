import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";

import { LickPanel } from "@/components/sessions/LickPanel";
import { createLick, deleteLick, updateLick } from "@/lib/api";
import { Lick, Track } from "@/types/session";


jest.mock("@/lib/api", () => ({
  createLick: jest.fn(),
  deleteLick: jest.fn(),
  reorderLicks: jest.fn(),
  updateLick: jest.fn(),
  updateTrack: jest.fn(),
}));

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: jest.fn(),
  closestCenter: jest.fn(),
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  arrayMove: jest.fn(),
  verticalListSortingStrategy: {},
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
  })),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => undefined),
    },
  },
}));

const mockCreateLick = createLick as jest.MockedFunction<typeof createLick>;
const mockDeleteLick = deleteLick as jest.MockedFunction<typeof deleteLick>;
const mockUpdateLick = updateLick as jest.MockedFunction<typeof updateLick>;

function buildLick(overrides: Partial<Lick> = {}): Lick {
  return {
    id: 11,
    track: 8,
    name: "Intro",
    start_seconds: 10,
    end_seconds: 42,
    last_speed: null,
    position: 0,
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    ...overrides,
  };
}

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 8,
    session: 3,
    name: "Practice Track",
    note: "",
    source_type: "youtube",
    youtube_url: "https://youtu.be/4nqDHK_dtwE",
    file: null,
    bpm: null,
    last_speed: null,
    position: 0,
    licks: [buildLick()],
    takes: [],
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
    ...overrides,
  };
}

function Harness() {
  const [track, setTrack] = useState(buildTrack());
  const [activeLickId, setActiveLickId] = useState<number | null>(11);
  const [draftStart, setDraftStart] = useState<number | null>(10);
  const [draftEnd, setDraftEnd] = useState<number | null>(42);
  const activeLick = track.licks.find((lick) => lick.id === activeLickId) ?? null;

  return (
    <LickPanel
      activeLick={activeLick}
      captureIn={() => setDraftStart(70)}
      captureOut={() => setDraftEnd(95)}
      clearDraft={() => {
        setDraftStart(null);
        setDraftEnd(null);
      }}
      draftEnd={draftEnd}
      draftStart={draftStart}
      mutateTrack={(updater) => setTrack((current) => updater(current))}
      replaceTrack={setTrack}
      setActiveLickId={setActiveLickId}
      setDraftEnd={setDraftEnd}
      setDraftStart={setDraftStart}
      toggleLick={(lickId) =>
        setActiveLickId((current) => (current === lickId ? null : lickId))
      }
      track={track}
    />
  );
}

describe("LickPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateLick.mockResolvedValue(
      buildLick({
        id: 12,
        name: "Outro",
        start_seconds: 70,
        end_seconds: 95,
        position: 1,
      })
    );
    mockUpdateLick.mockResolvedValue(
      buildLick({
        id: 11,
        name: "Intro",
        start_seconds: 70,
        end_seconds: 95,
      })
    );
  });

  it("creates a new lick after capturing a new timestamp while another lick is loaded", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Save Lick" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set In" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save Lick" })).toBeInTheDocument()
    );

    await user.type(screen.getByLabelText("New lick name"), "Outro");
    await user.click(screen.getByRole("button", { name: "Set Out" }));
    await user.click(screen.getByRole("button", { name: "Save Lick" }));

    await waitFor(() => expect(mockCreateLick).toHaveBeenCalledTimes(1));
    expect(mockCreateLick).toHaveBeenCalledWith({
      track: 8,
      name: "Outro",
      start_seconds: 70,
      end_seconds: 95,
      position: 1,
    });
    expect(mockUpdateLick).not.toHaveBeenCalled();
    expect(await screen.findByText("Outro")).toBeInTheDocument();
  });

  it("updates a saved lick after explicitly choosing to edit it", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Edit Intro" }));

    expect(screen.getByText("Editing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Lick" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set In" }));
    await user.click(screen.getByRole("button", { name: "Set Out" }));
    await user.click(screen.getByRole("button", { name: "Update Lick" }));

    await waitFor(() => expect(mockUpdateLick).toHaveBeenCalledTimes(1));
    expect(mockUpdateLick).toHaveBeenCalledWith(11, {
      name: "Intro",
      start_seconds: 70,
      end_seconds: 95,
    });
    expect(mockCreateLick).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getAllByText((_, element) =>
          element?.tagName.toLowerCase() === "p" &&
          element.textContent === "1:10 - 1:35"
        )
      ).toHaveLength(1)
    );
  });

  it("updates a saved lick from typed timestamp values", async () => {
    const user = userEvent.setup();
    mockUpdateLick.mockResolvedValue(
      buildLick({
        id: 11,
        name: "Intro",
        start_seconds: 72,
        end_seconds: 90,
      })
    );

    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Edit Intro" }));

    const inInput = screen.getByLabelText("In point");
    const outInput = screen.getByLabelText("Out point");

    await user.clear(inInput);
    await user.type(inInput, "1:12");
    await user.clear(outInput);
    await user.type(outInput, "90");
    await user.click(screen.getByRole("button", { name: "Update Lick" }));

    await waitFor(() => expect(mockUpdateLick).toHaveBeenCalledTimes(1));
    expect(mockUpdateLick).toHaveBeenCalledWith(11, {
      name: "Intro",
      start_seconds: 72,
      end_seconds: 90,
    });
    expect(mockCreateLick).not.toHaveBeenCalled();
  });

  it("deletes the active lick and clears the loaded loop", async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);
    mockDeleteLick.mockResolvedValue(undefined);

    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Delete Intro" }));

    await waitFor(() => expect(mockDeleteLick).toHaveBeenCalledWith(11));
    expect(screen.queryByRole("button", { name: /Intro/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop Loop" })).not.toBeInTheDocument();
  });

  it("stops the loaded loop and lets the same lick be loaded again", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Lick" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop Loop" }));

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.getByText("Load")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop Loop" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Lick" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Intro/ })[0]);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop Loop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Lick" })).toBeInTheDocument();
  });
});
