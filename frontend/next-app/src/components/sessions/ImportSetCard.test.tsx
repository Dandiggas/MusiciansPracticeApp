import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ImportSetCard } from "@/components/sessions/ImportSetCard";
import { importSetList, previewSetListImport } from "@/lib/api";

const push = jest.fn();
const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

jest.mock("@/lib/api", () => ({
  previewSetListImport: jest.fn(),
  importSetList: jest.fn(),
}));

const mockPreview = previewSetListImport as jest.MockedFunction<
  typeof previewSetListImport
>;
const mockImport = importSetList as jest.MockedFunction<typeof importSetList>;

function previewItems() {
  return {
    items: [
      {
        line: "1. Way Maker – Bb",
        title: "Way Maker",
        key: "Bb",
        match: {
          track_id: 11,
          track_name: "Way Maker",
          session_name: "Sunday 6 Jul",
          source_type: "youtube" as const,
          has_playable_source: true,
          bpm: 72,
          lick_count: 1,
        },
      },
      {
        line: "2. Brand New Song E",
        title: "Brand New Song",
        key: "E",
        match: null,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("collapsed by default, expands to the paste box", async () => {
  render(<ImportSetCard />);

  const trigger = screen.getByRole("button", {
    name: /paste this week's set list/i,
  });
  await userEvent.click(trigger);

  expect(screen.getByLabelText("Set list text")).toBeInTheDocument();
});

test("previews parsed songs with carry-over and new badges", async () => {
  mockPreview.mockResolvedValue(previewItems());
  render(<ImportSetCard />);

  await userEvent.click(
    screen.getByRole("button", { name: /paste this week's set list/i })
  );
  await userEvent.type(
    screen.getByLabelText("Set list text"),
    "1. Way Maker – Bb"
  );
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));

  expect(await screen.findByDisplayValue("Way Maker")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Bb")).toBeInTheDocument();
  expect(screen.getByText(/from “Sunday 6 Jul”/)).toBeInTheDocument();
  expect(screen.getByText("new")).toBeInTheDocument();
});

test("creates the session from the preview and navigates to it", async () => {
  mockPreview.mockResolvedValue(previewItems());
  mockImport.mockResolvedValue({
    id: 99,
    name: "Sunday 13 Jul",
    tracks: [],
    created_at: "",
    updated_at: "",
  });
  render(<ImportSetCard />);

  await userEvent.click(
    screen.getByRole("button", { name: /paste this week's set list/i })
  );
  await userEvent.type(screen.getByLabelText("Set list text"), "set");
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByDisplayValue("Way Maker");

  await userEvent.click(
    screen.getByRole("button", { name: /create session \(2 songs\)/i })
  );

  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
  const [, items] = mockImport.mock.calls[0];
  expect(items).toEqual([
    { title: "Way Maker", key: "Bb", source_track_id: 11 },
    { title: "Brand New Song", key: "E", source_track_id: null },
  ]);
  expect(push).toHaveBeenCalledWith("/sessions/99");
});

test("clicking the carry-over badge starts the song fresh instead", async () => {
  mockPreview.mockResolvedValue(previewItems());
  mockImport.mockResolvedValue({
    id: 99,
    name: "Sunday 13 Jul",
    tracks: [],
    created_at: "",
    updated_at: "",
  });
  render(<ImportSetCard />);

  await userEvent.click(
    screen.getByRole("button", { name: /paste this week's set list/i })
  );
  await userEvent.type(screen.getByLabelText("Set list text"), "set");
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByDisplayValue("Way Maker");

  await userEvent.click(screen.getByText(/from “Sunday 6 Jul”/));
  await userEvent.click(
    screen.getByRole("button", { name: /create session/i })
  );

  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
  const [, items] = mockImport.mock.calls[0];
  expect(items[0]).toEqual({
    title: "Way Maker",
    key: "Bb",
    source_track_id: null,
  });
});

test("a song row can be removed before creating", async () => {
  mockPreview.mockResolvedValue(previewItems());
  render(<ImportSetCard />);

  await userEvent.click(
    screen.getByRole("button", { name: /paste this week's set list/i })
  );
  await userEvent.type(screen.getByLabelText("Set list text"), "set");
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByDisplayValue("Way Maker");

  await userEvent.click(
    screen.getByRole("button", { name: /remove brand new song/i })
  );

  expect(screen.queryByDisplayValue("Brand New Song")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /create session \(1 songs\)/i })
  ).toBeInTheDocument();
});

test("shows the API error when preview fails", async () => {
  mockPreview.mockRejectedValue(new Error("Couldn't find any songs in that text."));
  render(<ImportSetCard />);

  await userEvent.click(
    screen.getByRole("button", { name: /paste this week's set list/i })
  );
  await userEvent.type(screen.getByLabelText("Set list text"), "???");
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));

  expect(
    await screen.findByText("Couldn't find any songs in that text.")
  ).toBeInTheDocument();
});
