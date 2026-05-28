import { NextRequest, NextResponse } from "next/server";

import { getAuthCookieName, getDjangoApiBaseUrl } from "@/lib/django-api";


function buildDjangoUrl(path: string[], search: string) {
  const normalizedPath = path.length > 0 ? `${path.join("/")}/` : "";
  return new URL(`${getDjangoApiBaseUrl()}/${normalizedPath}${search}`);
}


async function proxy(request: NextRequest, path: string[]) {
  const token = request.cookies.get(getAuthCookieName())?.value;
  const url = buildDjangoUrl(path, request.nextUrl.search);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    // @ts-expect-error Node fetch requires duplex when proxying request streams.
    duplex: "half",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}


export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}
