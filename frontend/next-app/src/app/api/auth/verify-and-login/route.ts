import { NextResponse } from "next/server";

import { getAuthCookieName, getDjangoApiBaseUrl } from "@/lib/django-api";


function shouldUseSecureCookie(request: Request) {
  const { hostname, protocol } = new URL(request.url);
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }

  if (protocol === "http:") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function normalizeVerificationBody(body: unknown) {
  if (!body || typeof body !== "object" || !("key" in body)) {
    return body;
  }

  const key = (body as { key?: unknown }).key;
  if (typeof key !== "string") {
    return body;
  }

  try {
    return { ...body, key: decodeURIComponent(key.trim()).trim() };
  } catch {
    return { ...body, key: key.trim() };
  }
}

export async function POST(request: Request) {
  const body = normalizeVerificationBody(await request.json());

  const response = await fetch(
    `${getDjangoApiBaseUrl()}/dj-rest-auth/registration/verify-and-login/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status || 500 });
  }

  const token = typeof data?.key === "string" ? data.key : "";
  const nextResponse = NextResponse.json(data, { status: 200 });
  if (token) {
    nextResponse.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(request),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return nextResponse;
}
