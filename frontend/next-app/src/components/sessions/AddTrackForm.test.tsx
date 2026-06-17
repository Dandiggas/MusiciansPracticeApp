import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddTrackForm } from "@/components/sessions/AddTrackForm";
import { createTrack } from "@/lib/api";
import { Track } from "@/types/session";


jest.mock("@/lib/api", () => ({
  createTrack: jest.fn(),
}));

const mockCreateTrack = createTrack as jest.MockedFunction<typeof createTrack>;

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 41,
    session: 7,
    name: "Praise on Demand",
    note: "",
    source_type: "youtube",
    youtube_url: "https://youtu.be/abc",
    file: null,
    bpm: 90,
    last_speed: null,
    position: 3,
    licks: [],
    takes: [],
    created_at: "2026-05-13T10:00:00.000Z",
    updated_at: "2026-05-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("AddTrackForm", () => {
  beforeEach(() => {
    mockCreateTrack.mockReset();
  });

  it("shows a validation error when the YouTube URL is blank", async () => {
    const user = userEvent.setup();

    render(
      <AddTrackForm
        sessionId={7}
        insertPosition={0}
        onTrackCreated={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /add track/i }));
    await user.type(screen.getByLabelText(/track name/i), "Praise on Demand");
    await user.click(screen.getByRole("button", { name: /save track/i }));

    expect(await screen.findByText("YouTube URL is required.")).toBeInTheDocument();
    expect(mockCreateTrack).not.toHaveBeenCalled();
  });

  it("shows a validation error when a file source is missing a file", async () => {
    const user = userEvent.setup();

    render(
      <AddTrackForm
        sessionId={7}
        insertPosition={0}
        onTrackCreated={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /add track/i }));
    await user.type(screen.getByLabelText(/track name/i), "Praise on Demand");
    await user.selectOptions(screen.getByLabelText(/source type/i), "mp3");
    await user.click(screen.getByRole("button", { name: /save track/i }));

    expect(await screen.findByText("A file is required for this source type.")).toBeInTheDocument();
    expect(mockCreateTrack).not.toHaveBeenCalled();
  });

  it.each([
    ["https://youtu.be/fQOXsG8YxvM", "https://www.youtube.com/watch?v=fQOXsG8YxvM"],
    [
      "https://youtu.be/fQOXsG8YxvM?si=share-token",
      "https://www.youtube.com/watch?v=fQOXsG8YxvM",
    ],
    [
      "https://www.youtube.com/watch?v=fQOXsG8YxvM",
      "https://www.youtube.com/watch?v=fQOXsG8YxvM",
    ],
    [
      "https://youtube.com/shorts/fQOXsG8YxvM",
      "https://www.youtube.com/watch?v=fQOXsG8YxvM",
    ],
  ])("normalizes a valid YouTube URL before submit: %s", async (url, expectedUrl) => {
    const user = userEvent.setup();
    const onTrackCreated = jest.fn();
    mockCreateTrack.mockResolvedValue(buildTrack());

    render(
      <AddTrackForm
        sessionId={7}
        insertPosition={0}
        onTrackCreated={onTrackCreated}
      />
    );

    await user.click(screen.getByRole("button", { name: /add track/i }));
    await user.type(screen.getByLabelText(/track name/i), "Praise on Demand");
    await user.type(screen.getByLabelText(/youtube url/i), url);
    await user.type(screen.getByLabelText(/bpm/i), "90");
    await user.click(screen.getByRole("button", { name: /save track/i }));

    await waitFor(() => expect(mockCreateTrack).toHaveBeenCalledTimes(1));

    const formData = mockCreateTrack.mock.calls[0][0];
    expect(formData.get("session")).toBe("7");
    expect(formData.get("name")).toBe("Praise on Demand");
    expect(formData.get("source_type")).toBe("youtube");
    expect(formData.get("position")).toBe("0");
    expect(formData.get("youtube_url")).toBe(expectedUrl);
    expect(formData.get("bpm")).toBe("90");

    await waitFor(() => expect(onTrackCreated).toHaveBeenCalledWith(buildTrack()));
    expect(screen.getByRole("button", { name: /add track/i })).toBeInTheDocument();
  });

  it("shows a validation error before submit for unrecognized YouTube URLs", async () => {
    const user = userEvent.setup();

    render(
      <AddTrackForm
        sessionId={7}
        insertPosition={0}
        onTrackCreated={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /add track/i }));
    await user.type(screen.getByLabelText(/track name/i), "Praise on Demand");
    await user.type(screen.getByLabelText(/youtube url/i), "https://example.com/video");
    await user.click(screen.getByRole("button", { name: /save track/i }));

    expect(
      await screen.findByText("Paste a normal YouTube link, e.g. https://youtu.be/...")
    ).toBeInTheDocument();
    expect(mockCreateTrack).not.toHaveBeenCalled();
  });

  it("maps raw network failures to a human save error", async () => {
    const user = userEvent.setup();
    mockCreateTrack.mockRejectedValue(new Error("Failed to fetch"));

    render(
      <AddTrackForm
        sessionId={7}
        insertPosition={0}
        onTrackCreated={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /add track/i }));
    await user.type(screen.getByLabelText(/track name/i), "Praise on Demand");
    await user.type(screen.getByLabelText(/youtube url/i), "https://youtu.be/fQOXsG8YxvM");
    await user.click(screen.getByRole("button", { name: /save track/i }));

    expect(
      await screen.findByText(
        "We couldn't save this track because the app server didn't respond. Please try again."
      )
    ).toBeInTheDocument();
  });

  it("submits the expected payload for a valid file track", async () => {
    const user = userEvent.setup();
    const onTrackCreated = jest.fn();
    const track = buildTrack({
      source_type: "mp3",
      youtube_url: "",
      file: "https://media.test/praise.mp3",
      bpm: null,
    });
    const file = new File(["audio-data"], "praise.mp3", { type: "audio/mpeg" });
    mockCreateTrack.mockResolvedValue(track);

    render(
      <AddTrackForm
        sessionId={7}
        insertPosition={2}
        onTrackCreated={onTrackCreated}
      />
    );

    await user.click(screen.getByRole("button", { name: /add track/i }));
    await user.type(screen.getByLabelText(/track name/i), "Praise on Demand");
    await user.selectOptions(screen.getByLabelText(/source type/i), "mp3");
    await user.upload(screen.getByLabelText(/file/i), file);
    await user.click(screen.getByRole("button", { name: /save track/i }));

    await waitFor(() => expect(mockCreateTrack).toHaveBeenCalledTimes(1));

    const formData = mockCreateTrack.mock.calls[0][0];
    expect(formData.get("session")).toBe("7");
    expect(formData.get("name")).toBe("Praise on Demand");
    expect(formData.get("source_type")).toBe("mp3");
    expect(formData.get("position")).toBe("2");
    expect(formData.get("file")).toBe(file);
    expect(formData.has("youtube_url")).toBe(false);
    expect(formData.has("bpm")).toBe(false);

    await waitFor(() => expect(onTrackCreated).toHaveBeenCalledWith(track));
    expect(screen.getByRole("button", { name: /add track/i })).toBeInTheDocument();
  });
});
