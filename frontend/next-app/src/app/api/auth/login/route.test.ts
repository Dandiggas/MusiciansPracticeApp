/**
 * @jest-environment node
 */

describe("auth login route", () => {
  const originalFetch = global.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: "token-123" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      })
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("does not mark the auth cookie as secure on localhost", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "codex",
          password: "pw123456",
        }),
      })
    );

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("practice_auth_token=token-123");
    expect(setCookie).not.toContain("Secure");
  });
});
