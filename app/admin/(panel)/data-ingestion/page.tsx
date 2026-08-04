import { redirect } from "next/navigation";

/** Dawne „Pobieranie Danych” / API FPL → Workspace (Excel SSOT). */
export default function DataIngestionPage() {
  redirect("/admin/workspace");
}
