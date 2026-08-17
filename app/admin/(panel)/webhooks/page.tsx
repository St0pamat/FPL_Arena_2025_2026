import { Webhook } from "lucide-react";
import { getWebhooksAdminPayload } from "@/app/admin/actions/discordWebhooks";
import { DiscordWebhooksPanel } from "@/components/admin/DiscordWebhooksPanel";

export const dynamic = "force-dynamic";

export default async function AdminWebhooksPage() {
  const payload = await getWebhooksAdminPayload();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#39FF14]">
          <Webhook className="h-3.5 w-3.5" />
          Discord
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">
          Zarządzanie Webhookami
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Trwałe URL Discord — niezależne od sezonu i piramidy. Hard Reset w Danger Zone{" "}
          <span className="text-slate-200">nie kasuje</span> tych ustawień. Po imporcie dywizji
          Level N mapuje się na <code className="text-slate-300">tier = N</code>.
        </p>
      </header>

      <DiscordWebhooksPanel initial={payload} />
    </div>
  );
}
