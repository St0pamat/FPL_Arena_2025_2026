import type { Metadata } from "next";
import "./na-minusie.css";
import { Footer } from "@/components/na-minusie/Footer";
import { StickyNavbar } from "@/components/na-minusie/StickyNavbar";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";

export const metadata: Metadata = {
  title: `${NA_MINUSIE_BRAND} — Fantasy bez pechowego terminarza`,
  description:
    "Liga H2H z systemem Mediana 2+1. 10-osobowe dywizje, dwa sezony w roku, fizyczne trofea. Wybierz angielski klub i dołącz.",
};

export default function NaMinusieLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nm-page flex min-h-screen flex-col bg-[#0B0F19]">
      <StickyNavbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
