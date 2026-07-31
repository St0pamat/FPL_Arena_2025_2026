import { redirect } from "next/navigation";

/** Stary URL → nowa zakładka Logotypy */
export default function LegacyClubLogosRedirect() {
  redirect("/admin/logos");
}
