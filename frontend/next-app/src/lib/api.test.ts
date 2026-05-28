import {
  createLick,
  createSession,
  createTake,
  createTrack,
  deleteLick,
  deleteSession,
  deleteTake,
  deleteTrack,
  renameSession,
  renameTake,
  reorderLicks,
  reorderTracks,
  updateLick,
  updateTrack,
} from "@/lib/api";


describe("API write helpers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
        },
        json: async () => ({ id: 1, ok: true }),
        text: async () => JSON.stringify({ id: 1, ok: true }),
      } as Response
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function lastRequest() {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(mockFetch).toHaveBeenCalled();

    const [input, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    return {
      input,
      init: init as RequestInit,
    };
  }

  function expectJsonRequest(
    expectedInput: string,
    expectedMethod: string,
    expectedBody: Record<string, unknown>
  ) {
    const { input, init } = lastRequest();

    expect(input).toBe(expectedInput);
    expect(init.method).toBe(expectedMethod);
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual(expectedBody);
  }

  function expectDeleteRequest(expectedInput: string) {
    const { input, init } = lastRequest();

    expect(input).toBe(expectedInput);
    expect(init.method).toBe("DELETE");
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.body).toBeUndefined();
  }

  it("sends the expected session write requests", async () => {
    await createSession("Kevin Bond");
    expectJsonRequest("/api/django/sessions", "POST", { name: "Kevin Bond" });

    await renameSession(3, "Sunday Shed");
    expectJsonRequest("/api/django/sessions/3/", "PATCH", { name: "Sunday Shed" });

    await deleteSession(3);
    expectDeleteRequest("/api/django/sessions/3/");
  });

  it("sends the expected track write requests", async () => {
    const formData = new FormData();
    formData.append("session", "3");
    formData.append("name", "Praise on Demand");
    formData.append("source_type", "youtube");
    formData.append("youtube_url", "https://youtu.be/abc");

    await createTrack(formData);

    let request = lastRequest();
    expect(request.input).toBe("/api/django/tracks");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toEqual({ Accept: "application/json" });
    expect(request.init.body).toBe(formData);

    await updateTrack(8, { name: "Pocket Study", bpm: 92 });
    expectJsonRequest("/api/django/tracks/8/", "PATCH", {
      name: "Pocket Study",
      bpm: 92,
    });

    await reorderTracks(3, [8, 5, 13]);
    expectJsonRequest("/api/django/sessions/3/reorder-tracks/", "POST", {
      track_ids: [8, 5, 13],
    });

    await deleteTrack(8);
    expectDeleteRequest("/api/django/tracks/8/");
  });

  it("sends the expected lick write requests", async () => {
    await createLick({
      track: 8,
      name: "Bridge lick",
      start_seconds: 12,
      end_seconds: 18,
    });
    expectJsonRequest("/api/django/licks", "POST", {
      track: 8,
      name: "Bridge lick",
      start_seconds: 12,
      end_seconds: 18,
    });

    await updateLick(21, { name: "Bridge lick v2", last_speed: 0.75 });
    expectJsonRequest("/api/django/licks/21/", "PATCH", {
      name: "Bridge lick v2",
      last_speed: 0.75,
    });

    await reorderLicks(8, [21, 22]);
    expectJsonRequest("/api/django/tracks/8/reorder-licks/", "POST", {
      lick_ids: [21, 22],
    });

    await deleteLick(21);
    expectDeleteRequest("/api/django/licks/21/");
  });

  it("sends the expected take write requests", async () => {
    const formData = new FormData();
    const file = new File(["take-data"], "take.webm", { type: "audio/webm" });
    formData.append("track", "8");
    formData.append("name", "Take 1");
    formData.append("file", file);

    await createTake(formData);

    const request = lastRequest();
    expect(request.input).toBe("/api/django/takes");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toEqual({ Accept: "application/json" });
    expect(request.init.body).toBe(formData);

    await renameTake(34, "Verse Take");
    expectJsonRequest("/api/django/takes/34/", "PATCH", { name: "Verse Take" });

    await deleteTake(34);
    expectDeleteRequest("/api/django/takes/34/");
  });
});
