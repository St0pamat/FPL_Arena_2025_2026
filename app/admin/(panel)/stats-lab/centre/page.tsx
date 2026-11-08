import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Kanoniczny skrót → główny Stats Lab z zakładką Centre. */
export default function AdminStatsLabCentrePage() {
  redirect("/admin/stats-lab?tab=centre");
}
