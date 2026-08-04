import { redirect } from "next/navigation";

/** Stary kreator dywizji usunięty (Excel SSOT) → Master Import w Bazie Graczy */
export default function AdminDivisionsPage() {
  redirect("/admin/players");
}
