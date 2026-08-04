import { SeasonTransitionBoard } from "@/components/admin/SeasonTransitionBoard";
import { getSeasons } from "@/app/admin/actions/db";

export const dynamic = "force-dynamic";

export default async function SeasonTransitionPage() {
  const seasons = await getSeasons();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <SeasonTransitionBoard seasons={seasons} />
    </div>
  );
}
