/**
 * @jest-environment node
 */

describe("auth verify-and-login route", () => {
  const originalFetch = global.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: "token-verify", user: 42 }), {
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

  it("sets the auth cookie from a successful verify-and-login response", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/verify-and-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: "confirm-key" }),
      })
    );

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("practice_auth_token=token-verify");
    expect(setCookie).not.toContain("Secure");
  });

  it("decodes URL-escaped keys before forwarding to Django", async () => {
    const { POST } = await import("./route");

    await POST(
      new Request("http://127.0.0.1:3000/api/auth/verify-and-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: "OQ%3A1wWYbJ%3Aabc123" }),
      })
    );

    const djangoRequest = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(djangoRequest.body)).toEqual({
      key: "OQ:1wWYbJ:abc123",
    });
  });
});
