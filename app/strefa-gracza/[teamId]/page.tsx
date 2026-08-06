import { redirect } from "next/navigation";

type Props = { params: Promise<{ teamId: string }> };

/** Legacy URL → /strefa-gracza/gracz/[teamId] */
export default async function StrefaGraczaLegacyProfileRedirect({ params }: Props) {
  const { teamId } = await params;
  redirect(`/strefa-gracza/gracz/${teamId}`);
}
