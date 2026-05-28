import { redirect } from "next/navigation";


export default function RecommendationsRedirectPage() {
  redirect("/sessions");
  return null;
}
