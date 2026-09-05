import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionWorkbench } from "./SessionWorkbench";
import { deleteTrack, updateTrack } from "@/lib/api";
import { SessionDetail, Track } from "@/types/session";

jest.mock("@/lib/api", () => ({ deleteTrack: jest.fn(), updateTrack: jest.fn() }));
jest.mock("./SessionHeader", () => ({ SessionHeader: () => null }));
jest.mock("./SessionPracticeTools", () => ({ SessionPracticeTools: () => null }));
jest.mock("./AddTrackForm", () => ({ AddTrackForm: () => null }));
jest.mock("./YoutubePlayer", () => ({ YoutubePlayer: () => null }));
jest.mock("./Mp3Player", () => ({ Mp3Player: () => null }));
jest.mock("./TrackTakesPanel", () => ({ TrackTakesPanel: () => null }));
jest.mock("./TrackList", () => ({
  TrackList: ({ tracks, onSelectTrack }: { tracks: Track[]; onSelectTrack: (id: number) => void }) => (
    <div>{tracks.map(track => <button key={track.id} onClick={() => onSelectTrack(track.id)}>{track.name}</button>)}</div>
  ),
}));

function session(): SessionDetail {
  return {
    id: 1, name: "Set", created_at: "2026-09-05", updated_at: "2026-09-05",
    tracks: [1, 2, 3].map(id => ({
      id, session: 1, name: `Song ${id}`, note: "", source_type: "youtube",
      youtube_url: "https://youtu.be/abcdefghijk", file: null, bpm: null,
      last_speed: null, position: id - 1, licks: [], takes: [],
      created_at: "2026-09-05", updated_at: "2026-09-05",
    })),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.mocked(deleteTrack).mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

it("allows consecutive track deletions, including the last track", async () => {
  const user = userEvent.setup();
  render(<SessionWorkbench session={session()} />);
  for (const id of [1, 2, 3]) {
    expect(screen.getByLabelText("Track name")).toHaveValue(`Song ${id}`);
    await user.click(screen.getByRole("button", { name: "Delete", exact: true }));
    await waitFor(() => expect(deleteTrack).toHaveBeenCalledWith(id));
    expect(screen.queryByRole("button", { name: "Deleting..." })).not.toBeInTheDocument();
  }
  expect(screen.getByText("Add your first practice item")).toBeVisible();
});

it("clears a failed track's error when selecting another track", async () => {
  jest.mocked(deleteTrack).mockRejectedValue(new Error("Delete failed"));
  const user = userEvent.setup();
  render(<SessionWorkbench session={session()} />);
  await user.click(screen.getByRole("button", { name: "Delete", exact: true }));
  expect(await screen.findByText("Delete failed")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Song 2", exact: true }));
  expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete", exact: true })).toBeEnabled();
});

it("does not carry a pending save into another track", async () => {
  jest.mocked(updateTrack).mockImplementation(() => new Promise(() => {}));
  const user = userEvent.setup();
  render(<SessionWorkbench session={session()} />);
  await user.type(screen.getByLabelText("Track name"), " edited");
  await user.click(screen.getByRole("button", { name: "Save Track" }));
  expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Song 2", exact: true }));
  await user.type(screen.getByLabelText("Track name"), " edited");
  expect(screen.getByRole("button", { name: "Save Track" })).toBeEnabled();
});
