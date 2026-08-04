import { redirect } from "next/navigation";

export default function AdminTeamsRedirectPage() {
  redirect("/admin/players");
}
