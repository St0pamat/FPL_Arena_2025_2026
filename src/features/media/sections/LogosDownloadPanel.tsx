import { LEAGUE_LOGO_SRC, teamLogoSrc } from "@/config/branding";
import type { Player } from "@/types/player";
import { TeamCrest } from "@/components/branding";
import { useState } from "react";

export type SocialLogoFormat = {
  id: string;
  label: string;
  width: number;
  height: number;
  /** Odstep wewnętrzny jako ułamek boku (0–0.3) */
  padding: number;
  background: string;
};

export const SOCIAL_LOGO_FORMATS: SocialLogoFormat[] = [
  {
    id: "square1080",
    label: "Post 1080×1080",
    width: 1080,
    height: 1080,
    padding: 0.12,
    background: "#0a0e17",
  },
  {
    id: "story1080",
    label: "Story 1080×1920",
    width: 1080,
    height: 1920,
    padding: 0.1,
    background: "#0a0e17",
  },
  {
    id: "profile512",
    label: "Avatar 512×512",
    width: 512,
    height: 512,
    padding: 0.1,
    background: "#0a0e17",
  },
];

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nie udało się wczytać grafiki"));
    img.src = src;
  });
}

async function renderSocialLogo(src: string, format: SocialLogoFormat): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niedostępny");

  ctx.fillStyle = format.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padX = format.width * format.padding;
  const padY = format.height * format.padding;
  const boxW = format.width - padX * 2;
  const boxH = format.height - padY * 2;
  const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const x = (format.width - drawW) / 2;
  const y = (format.height - drawH) / 2;

  ctx.drawImage(img, x, y, drawW, drawH);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Eksport PNG nieudany"))), "image/png");
  });
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function downloadOriginal(src: string, filename: string) {
  const res = await fetch(src);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadSocial(src: string, baseName: string, format: SocialLogoFormat) {
  const blob = await renderSocialLogo(src, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}-${format.id}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

const LogoAssetCard = ({
  title,
  subtitle,
  src,
  fileBase,
  fplId,
}: {
  title: string;
  subtitle?: string;
  src: string;
  fileBase: string;
  fplId?: number;
}) => {
  const [busy, setBusy] = useState<string | null>(null);

  const handle = async (kind: "original" | string) => {
    setBusy(kind);
    try {
      if (kind === "original") {
        await downloadOriginal(src, `${fileBase}-oryginal.png`);
      } else {
        const format = SOCIAL_LOGO_FORMATS.find((f) => f.id === kind);
        if (format) await downloadSocial(src, fileBase, format);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="glass-panel panel-pad rounded-2xl border border-slate-800 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {fplId ? (
          <TeamCrest fplId={fplId} size="xl" className="shrink-0" />
        ) : (
          <div className="w-20 h-20 shrink-0 flex items-center justify-center crest-frame rounded-xl p-2">
            <img src={src} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-white text-fluid-base leading-snug break-words">{title}</h3>
          {subtitle && <p className="text-fluid-sm text-slate-500 mt-0.5 break-words">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => handle("original")}
          className="px-3 py-2 rounded-lg text-fluid-xs font-semibold border border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
        >
          {busy === "original" ? "…" : "Oryginał PNG"}
        </button>
        {SOCIAL_LOGO_FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={!!busy}
            onClick={() => handle(f.id)}
            className="px-3 py-2 rounded-lg text-fluid-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {busy === f.id ? "…" : f.label}
          </button>
        ))}
      </div>
    </article>
  );
};

export const LogosDownloadPanel = ({ players }: { players: Player[] }) => (
  <div className="space-y-8">
    <div className="glass-panel panel-pad rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
      <p className="text-fluid-sm text-slate-300 leading-relaxed">
        Logotypy w formatach gotowych pod social media: <strong className="text-emerald-300">post kwadratowy 1080×1080</strong>,{" "}
        <strong className="text-emerald-300">story pion 1080×1920</strong> i{" "}
        <strong className="text-emerald-300">avatar 512×512</strong>. Każdy plik ma ciemne tło Areny i wycentrowany herb.
        Dostępny też oryginalny PNG źródłowy.
      </p>
    </div>

    <section>
      <h3 className="text-fluid-lg font-athletic font-bold text-white uppercase tracking-wide mb-4">
        Logo ligi
      </h3>
      <LogoAssetCard
        title="FPL Arena"
        subtitle="Igrzyska Kapci Kłapcia · Sezon 2025/26"
        src={LEAGUE_LOGO_SRC}
        fileBase="FPL-Arena-liga"
      />
    </section>

    <section>
      <h3 className="text-fluid-lg font-athletic font-bold text-white uppercase tracking-wide mb-4">
        Herby klubów ({players.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {players.map((p) => (
          <LogoAssetCard
            key={p.id}
            title={p.team}
            subtitle={p.manager}
            src={teamLogoSrc(p.id)}
            fileBase={`FPL-Arena-${slugify(p.team) || p.id}`}
            fplId={p.id}
          />
        ))}
      </div>
    </section>
  </div>
);
