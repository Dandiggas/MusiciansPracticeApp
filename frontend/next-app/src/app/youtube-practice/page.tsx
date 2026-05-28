import { redirect } from "next/navigation";


export default function YoutubePracticeRedirectPage() {
  redirect("/sessions");
  return null;
}
