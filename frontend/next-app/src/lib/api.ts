import { Lick, SessionDetail, SessionSummary, Take, Track } from "@/types/session";


type JsonBody = Record<string, unknown>;

const DEFAULT_NETWORK_ERROR =
  "The app server didn't respond. Please try again.";

function isJsonResponse(response: Response) {
  return (response.headers.get("content-type") || "").includes("application/json");
}

async function readBody(response: Response) {
  if (isJsonResponse(response)) {
    return response.json();
  }
  return response.text();
}

function extractErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    const firstValue = Object.values(body)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
    if ("detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  }

  return fallback;
}

async function requestJson<T>(
  input: string,
  init: RequestInit,
  fallbackMessage: string,
  networkMessage = DEFAULT_NETWORK_ERROR
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new Error(networkMessage);
  }

  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, fallbackMessage));
  }

  return body as T;
}

function jsonRequest(method: string, body?: JsonBody): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}

export async function createSession(name: string): Promise<SessionSummary> {
  return requestJson<SessionSummary>(
    "/api/django/sessions",
    jsonRequest("POST", { name }),
    "Could not create session."
  );
}

export async function renameSession(sessionId: number, name: string) {
  return requestJson<SessionSummary>(
    `/api/django/sessions/${sessionId}/`,
    jsonRequest("PATCH", { name }),
    "Could not rename session."
  );
}

export async function deleteSession(sessionId: number) {
  await requestJson<null>(
    `/api/django/sessions/${sessionId}/`,
    { method: "DELETE", headers: { Accept: "application/json" } },
    "Could not delete session."
  );
}

export async function getSession(sessionId: number): Promise<SessionDetail> {
  return requestJson<SessionDetail>(
    `/api/django/sessions/${sessionId}/`,
    { method: "GET", headers: { Accept: "application/json" } },
    "Could not load session."
  );
}

export async function reorderTracks(sessionId: number, trackIds: number[]) {
  await requestJson<{ ok: true }>(
    `/api/django/sessions/${sessionId}/reorder-tracks/`,
    jsonRequest("POST", { track_ids: trackIds }),
    "Could not reorder tracks."
  );
}

export async function createTrack(formData: FormData) {
  return requestJson<Track>(
    "/api/django/tracks",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
    "Could not create track.",
    "We couldn't save this track because the app server didn't respond. Please try again."
  );
}

export async function updateTrack(trackId: number, payload: JsonBody) {
  return requestJson<Track>(
    `/api/django/tracks/${trackId}/`,
    jsonRequest("PATCH", payload),
    "Could not update track."
  );
}

export async function deleteTrack(trackId: number) {
  await requestJson<null>(
    `/api/django/tracks/${trackId}/`,
    { method: "DELETE", headers: { Accept: "application/json" } },
    "Could not delete track."
  );
}

export async function reorderLicks(trackId: number, lickIds: number[]) {
  await requestJson<{ ok: true }>(
    `/api/django/tracks/${trackId}/reorder-licks/`,
    jsonRequest("POST", { lick_ids: lickIds }),
    "Could not reorder licks."
  );
}

export async function createLick(payload: JsonBody) {
  return requestJson<Lick>(
    "/api/django/licks",
    jsonRequest("POST", payload),
    "Could not save lick."
  );
}

export async function updateLick(lickId: number, payload: JsonBody) {
  return requestJson<Lick>(
    `/api/django/licks/${lickId}/`,
    jsonRequest("PATCH", payload),
    "Could not update lick."
  );
}

export async function deleteLick(lickId: number) {
  await requestJson<null>(
    `/api/django/licks/${lickId}/`,
    { method: "DELETE", headers: { Accept: "application/json" } },
    "Could not delete lick."
  );
}

export async function createTake(formData: FormData) {
  return requestJson<Take>(
    "/api/django/takes",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
    "Could not save take."
  );
}

export async function renameTake(takeId: number, name: string) {
  return requestJson<Take>(
    `/api/django/takes/${takeId}/`,
    jsonRequest("PATCH", { name }),
    "Could not rename take."
  );
}

export async function deleteTake(takeId: number) {
  await requestJson<null>(
    `/api/django/takes/${takeId}/`,
    { method: "DELETE", headers: { Accept: "application/json" } },
    "Could not delete take."
  );
}
