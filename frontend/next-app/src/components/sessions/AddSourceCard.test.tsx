import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddSourceCard } from "@/components/sessions/AddSourceCard";
import { updateTrack } from "@/lib/api";
import { Track } from "@/types/session";

jest.mock("@/lib/api", () => ({
  updateTrack: jest.fn(),
}));

const mockUpdate = updateTrack as jest.MockedFunction<typeof updateTrack>;

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 5,
    session: 7,
    name: "Goodness of God",
    note: "",
    called_key: "A",
    source_type: "none",
    youtube_url: "",
    file: null,
    bpm: null,
    last_speed: null,
    position: 1,
    licks: [],
    takes: [],
    created_at: "2026-07-09T10:00:00.000Z",
    updated_at: "2026-07-09T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("mentions the called key so you grab the right version", () => {
  render(<AddSourceCard track={buildTrack()} replaceTrack={jest.fn()} />);
  expect(screen.getByText(/called in A/)).toBeInTheDocument();
});

test("normalizes the pasted link and attaches it to the same track", async () => {
  const replaceTrack = jest.fn();
  const updated = buildTrack({
    source_type: "youtube",
    youtube_url: "https://www.youtube.com/watch?v=abc123XYZ_-",
  });
  mockUpdate.mockResolvedValue(updated);

  render(<AddSourceCard track={buildTrack()} replaceTrack={replaceTrack} />);

  await userEvent.type(
    screen.getByLabelText("YouTube link for Goodness of God"),
    "https://youtu.be/abc123XYZ_-?t=42"
  );
  await userEvent.click(screen.getByRole("button", { name: "Add source" }));

  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate).toHaveBeenCalledWith(5, {
    source_type: "youtube",
    youtube_url: "https://www.youtube.com/watch?v=abc123XYZ_-",
  });
  expect(replaceTrack).toHaveBeenCalledWith(updated);
});

test("rejects a non-YouTube link without calling the API", async () => {
  render(<AddSourceCard track={buildTrack()} replaceTrack={jest.fn()} />);

  await userEvent.type(
    screen.getByLabelText("YouTube link for Goodness of God"),
    "https://example.com/song.mp3"
  );
  await userEvent.click(screen.getByRole("button", { name: "Add source" }));

  expect(
    await screen.findByText(/paste a normal youtube link/i)
  ).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("surfaces the API error when the attach fails", async () => {
  mockUpdate.mockRejectedValue(new Error("Could not update track."));
  render(<AddSourceCard track={buildTrack()} replaceTrack={jest.fn()} />);

  await userEvent.type(
    screen.getByLabelText("YouTube link for Goodness of God"),
    "https://youtu.be/abc123XYZ_-"
  );
  await userEvent.click(screen.getByRole("button", { name: "Add source" }));

  expect(await screen.findByText("Could not update track.")).toBeInTheDocument();
});
