import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthCookieName, getDjangoApiBaseUrl } from "@/lib/django-api";


export async function djangoFetch(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (!token) {
    redirect("/login");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Token ${token}`);
  headers.set("Accept", "application/json");

  const response = await fetch(
    `${getDjangoApiBaseUrl()}/${path.replace(/^\/+/, "")}`,
    {
      ...init,
      headers,
      cache: "no-store",
    }
  );

  if (response.status === 401 || response.status === 403) {
    redirect("/login");
  }

  return response;
}


export async function djangoFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await djangoFetch(path, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
