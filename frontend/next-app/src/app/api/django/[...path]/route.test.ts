/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";


describe("django write proxy", () => {
  const originalFetch = global.fetch;
  const textEncoder = new TextEncoder();

  async function readProxiedBody(body: BodyInit | null | undefined) {
    return new Response(body ?? null).text();
  }

  beforeEach(() => {
    jest.resetModules();
    process.env.DJANGO_API_URL = "http://django.test/api/v1";
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 17 }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      })
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.DJANGO_API_URL;
  });

  it("materializes multipart track uploads before forwarding them to Django", async () => {
    const { POST } = await import("./route");
    const body = [
      "--demo",
      'Content-Disposition: form-data; name="name"',
      "",
      "Praise on Demand",
      "--demo--",
    ].join("\r\n");

    const request = new NextRequest("http://app.test/api/django/tracks", {
      method: "POST",
      headers: {
        cookie: "practice_auth_token=test-token",
        "content-type": "multipart/form-data; boundary=demo",
        "content-length": String(body.length),
        host: "app.test",
        "x-trace-id": "trace-123",
      },
      body,
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["tracks"] }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe("application/json");

    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    const proxiedInit = init as RequestInit & {
      duplex?: string;
      headers: Headers;
    };

    expect(String(url)).toBe("http://django.test/api/v1/tracks/");
    expect(proxiedInit.method).toBe("POST");
    await expect(readProxiedBody(proxiedInit.body)).resolves.toBe(body);
    expect(proxiedInit.duplex).toBeUndefined();
    expect(proxiedInit.headers.get("Authorization")).toBe("Token test-token");
    expect(proxiedInit.headers.get("content-type")).toBe("multipart/form-data; boundary=demo");
    expect(proxiedInit.headers.get("x-trace-id")).toBe("trace-123");
    expect(proxiedInit.headers.get("host")).toBeNull();
    expect(proxiedInit.headers.get("content-length")).toBe(String(textEncoder.encode(body).byteLength));
  });

  it("materializes JSON writes before forwarding them to Django", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ name: "Kevin Bond" });

    const request = new NextRequest("http://app.test/api/django/sessions", {
      method: "POST",
      headers: {
        cookie: "practice_auth_token=test-token",
        "content-type": "application/json",
        host: "app.test",
      },
      body,
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["sessions"] }),
    });

    expect(response.status).toBe(201);

    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    const [url, init] = mockFetch.mock.calls[0];
    const proxiedInit = init as RequestInit & {
      duplex?: string;
      headers: Headers;
    };

    expect(String(url)).toBe("http://django.test/api/v1/sessions/");
    expect(proxiedInit.method).toBe("POST");
    await expect(readProxiedBody(proxiedInit.body)).resolves.toBe(body);
    expect(proxiedInit.duplex).toBeUndefined();
    expect(proxiedInit.headers.get("content-type")).toBe("application/json");
    expect(proxiedInit.headers.get("content-length")).toBe(String(textEncoder.encode(body).byteLength));
  });

  it("returns a JSON 502 when Django cannot be reached", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as typeof fetch;
    const { POST } = await import("./route");
    const body = JSON.stringify({ name: "Praise on Demand" });

    const request = new NextRequest("http://app.test/api/django/tracks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["tracks"] }),
    });

    await expect(response.json()).resolves.toEqual({
      detail: "The app server could not be reached. Please try again.",
    });
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
