import { redirect } from "next/navigation";


export default function PracticeTimerRedirectPage() {
  redirect("/sessions");
  return null;
}
