import { redirect } from "next/navigation";

/** Alias → kanoniczna ścieżka Etapu 3. */
export default function SeasonSettlementRedirect() {
  redirect("/admin/season-transition");
}
