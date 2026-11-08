import { redirect } from "next/navigation";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";

/** Legacy alias — kanoniczna Strefa Gracza to `/strefa-gracza`. */
export default function PublicHubRedirectPage() {
  redirect(NA_MINUSIE_PATHS.strefaGracza);
}
