import { redirect } from "next/navigation";

/** Legacy Kalkulator GW → Workspace (MODUŁ 1+3) */
export default function AdminGwResultsRedirect() {
  redirect("/admin/workspace");
}
