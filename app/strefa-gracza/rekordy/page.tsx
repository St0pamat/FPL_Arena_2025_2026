import { redirect } from "next/navigation";

export default function StrefaGraczaRekordyRedirect() {
  redirect("/strefa-gracza?tab=statystyki");
}
