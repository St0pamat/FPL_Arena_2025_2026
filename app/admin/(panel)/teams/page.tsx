import { redirect } from "next/navigation";

export default function LegacyTeamsRedirect() {
  redirect("/admin/uczestnicy");
}
