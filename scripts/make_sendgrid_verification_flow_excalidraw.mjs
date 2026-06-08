import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outPath = path.resolve(
  "docs/diagrams/sendgrid-email-verification-flow.excalidraw",
);

function id() {
  return crypto.randomBytes(9).toString("base64url");
}

function nonce() {
  return crypto.randomBytes(4).readUInt32BE(0);
}

function base(type, x, y, width, height) {
  return {
    id: id(),
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    seed: nonce(),
    version: 1,
    versionNonce: nonce(),
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: type === "rectangle" ? { type: 3 } : null,
  };
}

function rect(x, y, width, height, backgroundColor = "#ffffff", opts = {}) {
  return {
    ...base("rectangle", x, y, width, height),
    backgroundColor,
    strokeColor: opts.strokeColor ?? "#1e1e1e",
    strokeStyle: opts.strokeStyle ?? "solid",
    strokeWidth: opts.strokeWidth ?? 2,
  };
}

function text(x, y, width, height, value, opts = {}) {
  return {
    ...base("text", x, y, width, height),
    strokeColor: opts.color ?? "#1e1e1e",
    strokeWidth: 1,
    text: value,
    fontSize: opts.size ?? 16,
    fontFamily: 1,
    textAlign: opts.align ?? "center",
    verticalAlign: opts.verticalAlign ?? "middle",
    baseline: Math.round((opts.size ?? 16) * 0.8),
    containerId: null,
    originalText: value,
    lineHeight: 1.25,
  };
}

function arrow(x1, y1, x2, y2, opts = {}) {
  return {
    ...base("arrow", x1, y1, x2 - x1, y2 - y1),
    strokeColor: opts.color ?? "#444444",
    strokeStyle: opts.dashed ? "dashed" : "solid",
    roundness: { type: 2 },
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
  };
}

function labelBox(x, y, width, height, title, body, color, opts = {}) {
  const titleHeight = body ? 34 : height;
  return [
    rect(x, y, width, height, color, opts),
    text(x + 12, y + 9, width - 24, titleHeight, title, {
      size: opts.titleSize ?? 17,
      color: opts.titleColor ?? "#111111",
      verticalAlign: body ? "top" : "middle",
    }),
    ...(body
      ? [
          text(x + 14, y + 43, width - 28, height - 52, body, {
            size: opts.bodySize ?? 13,
            color: opts.bodyColor ?? "#343a40",
            verticalAlign: "top",
          }),
        ]
      : []),
  ];
}

const elements = [
  text(
    70,
    24,
    1080,
    42,
    "The Shed email verification flow with SendGrid",
    { size: 28, align: "left" },
  ),
  text(
    72,
    70,
    1080,
    28,
    "Green = user-facing path. Blue = app/backend. Yellow = external SendGrid/email systems. Gray = required setup before production.",
    { size: 14, align: "left", color: "#495057" },
  ),

  ...labelBox(
    70,
    120,
    1080,
    118,
    "Required before SendGrid can work",
    [
      "1. SendGrid account with an API key that has Mail Send permission.",
      "2. Verified Sender Identity: authenticated domain is best for production; single sender is acceptable for testing.",
      "3. Railway/backend env vars: SENDGRID_API_KEY, DEFAULT_FROM_EMAIL, FRONTEND_URL.",
      "4. DEFAULT_FROM_EMAIL must match a verified sender/domain.",
      "5. Backend can reach smtp.sendgrid.net:587 using STARTTLS; database and migrations are healthy.",
    ].join("\n"),
    "#e9ecef",
    { titleSize: 19, bodySize: 14 },
  ),

  ...labelBox(70, 300, 210, 84, "User", "Submits register form with username, email, password.", "#d3f9d8"),
  ...labelBox(360, 300, 250, 84, "Next.js app", "POST /api/django/dj-rest-auth/registration/", "#d0ebff"),
  ...labelBox(690, 300, 260, 84, "Django + allauth", "Creates user and EmailAddress with verified=false.", "#d0ebff"),
  ...labelBox(1030, 300, 260, 84, "Database", "Stores user, email address, and verification state.", "#e9ecef"),

  arrow(280, 342, 360, 342),
  arrow(610, 342, 690, 342),
  arrow(950, 342, 1030, 342),

  ...labelBox(690, 450, 260, 94, "CustomAccountAdapter", "Builds public link:\nFRONTEND_URL/auth/verify/<key>", "#d0ebff"),
  ...labelBox(360, 450, 250, 94, "Django email backend", "If SENDGRID_API_KEY exists, uses SMTP backend.", "#d0ebff"),
  ...labelBox(70, 450, 210, 94, "SendGrid SMTP", "smtp.sendgrid.net:587\nuser: apikey\npassword: SENDGRID_API_KEY", "#fff3bf"),

  arrow(820, 384, 820, 450),
  arrow(690, 497, 610, 497),
  arrow(360, 497, 280, 497),

  ...labelBox(70, 610, 210, 84, "SendGrid checks sender", "DEFAULT_FROM_EMAIL must be verified or mail is rejected.", "#fff3bf"),
  ...labelBox(360, 610, 250, 84, "Recipient inbox", "Receives The Shed confirmation email.", "#fff3bf"),
  ...labelBox(690, 610, 260, 84, "User clicks link", "Browser opens /auth/verify/<key> on the frontend.", "#d3f9d8"),
  ...labelBox(1030, 610, 260, 84, "Verify page", "POST /api/auth/verify-and-login with trimmed key.", "#d0ebff"),

  arrow(175, 544, 175, 610),
  arrow(280, 652, 360, 652),
  arrow(610, 652, 690, 652),
  arrow(950, 652, 1030, 652),

  ...labelBox(1030, 760, 260, 98, "Next.js API route", "Forwards to Django:\n/api/v1/dj-rest-auth/registration/verify-and-login/", "#d0ebff"),
  ...labelBox(690, 760, 260, 98, "Django verify endpoint", "Resolves HMAC or DB key, checks expired/invalid/already verified.", "#d0ebff"),
  ...labelBox(360, 760, 250, 98, "Successful verification", "confirmation.confirm() flips verified=true and creates/gets DRF token.", "#d3f9d8"),
  ...labelBox(70, 760, 210, 98, "Logged in", "Next.js sets httpOnly practice_auth_token cookie and redirects to /sessions.", "#d3f9d8"),

  arrow(1160, 694, 1160, 760),
  arrow(1030, 809, 950, 809),
  arrow(690, 809, 610, 809),
  arrow(360, 809, 280, 809),

  ...labelBox(
    690,
    920,
    260,
    96,
    "Failure branch",
    "404 invalid, 409 already verified, 410 expired. UI can offer resend for invalid/expired links.",
    "#ffe3e3",
    { strokeStyle: "dashed" },
  ),
  ...labelBox(
    1030,
    920,
    260,
    96,
    "Resend email",
    "POST /api/django/dj-rest-auth/registration/resend-email/ sends a fresh link through the same SMTP path.",
    "#fff3bf",
    { strokeStyle: "dashed" },
  ),
  arrow(820, 858, 820, 920, { dashed: true }),
  arrow(950, 968, 1030, 968, { dashed: true }),
];

const scene = {
  type: "excalidraw",
  version: 2,
  source: "codex",
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: "#fbfbfb",
  },
  files: {},
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(scene, null, 2)}\n`);
console.log(outPath);
