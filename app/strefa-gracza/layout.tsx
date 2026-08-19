import type { Metadata } from "next";
import "../na-minusie/na-minusie.css";
import { Footer } from "@/components/na-minusie/Footer";
import { StickyNavbar } from "@/components/na-minusie/StickyNavbar";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import { createClient } from "@/lib/supabase/server";
import { NM_BELOW_STICKY_HEADER } from "@/lib/na-minusie/theme";

export const metadata: Metadata = {
  title: `Strefa Gracza — ${NA_MINUSIE_BRAND}`,
  description:
    "Tabele ligowe, wyniki H2H, terminarz, centrum kolejki i profile graczy — Na Minusie ™.",
};

export const dynamic = "force-dynamic";

export default async function StrefaGraczaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAdmin = false;
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    isAdmin = Boolean(auth.user);
  } catch {
    isAdmin = false;
  }

  return (
    <div className="nm-page flex min-h-screen flex-col bg-[#0B0F19]">
      <StickyNavbar />
      {isAdmin && (
        <div
          className={`sticky z-40 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center backdrop-blur-md ${NM_BELOW_STICKY_HEADER}`}
          role="status"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
            [ TRYB ADMINA ]
          </p>
        </div>
      )}
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
