import { NextRequest, NextResponse } from "next/server";

import { getAuthCookieName, getDjangoApiBaseUrl } from "@/lib/django-api";


function buildDjangoUrl(path: string[], search: string) {
  const normalizedPath = path.length > 0 ? `${path.join("/")}/` : "";
  return new URL(`${getDjangoApiBaseUrl()}/${normalizedPath}${search}`);
}

function requestCanHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}

async function buildBodyInit(request: NextRequest, headers: Headers) {
  if (!requestCanHaveBody(request.method)) {
    return {};
  }

  const body = await request.arrayBuffer();
  headers.set("content-length", String(body.byteLength));
  return { body };
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

  const bodyInit = await buildBodyInit(request, headers);
  const response = await fetch(url, {
    method: request.method,
    headers,
    ...bodyInit,
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
