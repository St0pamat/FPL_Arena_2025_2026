import Link from "next/link";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";

export default function StrefaGraczaNotFound() {
  return (
    <main className="relative min-h-[60vh] bg-slate-900 font-sans text-slate-100">
      <div className={`${NM_CONTAINER} flex flex-col items-center justify-center py-20 text-center`}>
        <p className="text-6xl font-extrabold text-slate-700">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Gracz nie znaleziony</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Ta drużyna nie występuje w aktywnym sezonie lub link jest nieprawidłowy.
        </p>
        <Link
          href="/strefa-gracza"
          className="mt-8 rounded-xl border border-sky-500/40 bg-sky-500/10 px-6 py-3 text-sm font-bold text-sky-300 transition-colors hover:bg-sky-500/20"
        >
          Wróć do Strefy Gracza
        </Link>
      </div>
    </main>
  );
}
