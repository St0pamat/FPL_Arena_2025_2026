import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";
import { NA_MINUSIE_LOGO, NA_MINUSIE_LOGO_ALT } from "@/lib/na-minusie/branding";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(57,255,20,0.08),transparent)]" />

      <div className="relative w-full max-w-md">
        <div className="admin-card border-[#39FF14]/10 p-8 shadow-[0_0_60px_rgba(57,255,20,0.06)] sm:p-10">
          <div className="mb-8 text-center">
            <Image
              src={NA_MINUSIE_LOGO}
              alt={NA_MINUSIE_LOGO_ALT}
              width={72}
              height={72}
              className="mx-auto mb-5 h-16 w-16 object-contain"
            />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Panel Admina</p>
            <h1 className="mt-3 text-2xl font-extrabold text-white">Na Minusie ™</h1>
            <p className="mt-2 text-sm text-[#888]">Zaloguj się, aby zarządzać ligą</p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-[#555]">
            <Link href="/na-minusie" className="transition-colors hover:text-[#39FF14]">
              ← Powrót na stronę ligi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
