import http from "node:http";

const port = Number(process.env.MOCK_DJANGO_PORT || 8010);

const now = "2026-06-08T09:00:00.000Z";
const sessions = new Map([
  [
    1,
    {
      id: 1,
      name: "Sunday Shed",
      created_at: now,
      updated_at: now,
      tracks: [
        {
          id: 11,
          session: 1,
          name: "Pocket study",
          note: "Keep the second chorus relaxed.",
          source_type: "youtube",
          youtube_url: "https://youtu.be/dQw4w9WgXcQ",
          file: null,
          bpm: 92,
          last_speed: 0.75,
          position: 0,
          licks: [],
          takes: [],
          created_at: now,
          updated_at: now,
        },
      ],
    },
  ],
]);

function summary(session) {
  return {
    id: session.id,
    name: session.name,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const path = url.pathname.replace(/\/+$/, "/");

  if (request.method === "GET" && path === "/") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!request.headers.authorization) {
    sendJson(response, 401, { detail: "Authentication credentials were not provided." });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/current-user/") {
    sendJson(response, 200, { id: 1, username: "player", email: "player@example.com" });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/sessions/") {
    sendJson(response, 200, Array.from(sessions.values()).map(summary));
    return;
  }

  if (request.method === "POST" && path === "/api/v1/sessions/") {
    const body = await readJson(request);
    const nextId = 2;
    const session = {
      id: nextId,
      name: String(body.name || "New session"),
      created_at: now,
      updated_at: now,
      tracks: [],
    };
    sessions.set(nextId, session);
    sendJson(response, 201, summary(session));
    return;
  }

  const sessionMatch = path.match(/^\/api\/v1\/sessions\/(\d+)\/$/);
  if (request.method === "GET" && sessionMatch) {
    const session = sessions.get(Number(sessionMatch[1]));
    if (!session) {
      sendJson(response, 404, { detail: "Not found." });
      return;
    }
    sendJson(response, 200, session);
    return;
  }

  sendJson(response, 404, { detail: "No mock route." });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Django API listening on http://127.0.0.1:${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
