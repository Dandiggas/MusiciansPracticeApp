import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthCookieName } from "@/lib/django-api";


export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  redirect(token ? "/sessions" : "/login");
}
