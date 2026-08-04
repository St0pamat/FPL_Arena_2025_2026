import { redirect } from "next/navigation";

/** Alias → nowa Baza Graczy (Excel SSOT) */
export default function AdminUczestnicyRedirectPage() {
  redirect("/admin/players");
}
