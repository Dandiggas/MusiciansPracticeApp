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

export async function POST(request: Request) {
  const cookieStore = request.headers.get("cookie") || "";
  const token = cookieStore
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${getAuthCookieName()}=`))
    ?.split("=")[1];

  if (token) {
    await fetch(`${getDjangoApiBaseUrl()}/logout/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
      },
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}
