import { LEAGUE_LOGO_SRC, teamLogoSrc } from "@arena/config/branding";
import type { Player } from "@arena/types/player";
import type { CardContent } from "@arena/features/centrum/lib/cardContent";

const ACCENT: Record<CardContent["accent"], string> = {
  emerald: "#10b981",
  amber: "#fbbf24",
  red: "#ef4444",
  blue: "#3b82f6",
  violet: "#8b5cf6",
};

export const ShareCardDocument = ({
  player,
  content,
}: {
  player: Player;
  content: CardContent;
}) => {
  const accent = ACCENT[content.accent];

  return (
    <div
      className="relative overflow-hidden bg-[#0a0e17] text-white box-border"
      style={{ width: 1080, height: 1080, fontFamily: "system-ui, Segoe UI, sans-serif" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 15% 10%, ${accent}40, transparent 42%), radial-gradient(circle at 95% 90%, #3b82f628, transparent 40%)`,
        }}
      />
      <div className="absolute inset-3 rounded-[28px] border-[3px] pointer-events-none" style={{ borderColor: `${accent}55` }} />
      <div
        className="absolute inset-6 rounded-[22px] border pointer-events-none opacity-40"
        style={{ borderColor: `${accent}33` }}
      />

      <div
        className="relative z-10 box-border flex flex-col"
        style={{ width: 1080, height: 1080, padding: "44px 48px 40px" }}
      >
        {/* Nagłówek */}
        <div className="flex items-center justify-between shrink-0" style={{ marginBottom: 36 }}>
          <img src={LEAGUE_LOGO_SRC} alt="" style={{ height: 72, objectFit: "contain" }} />
          <span
            style={{
              padding: "12px 28px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: `${accent}22`,
              color: accent,
              border: `2px solid ${accent}66`,
            }}
          >
            {content.badge}
          </span>
        </div>

        {/* Tożsamość */}
        <div className="flex items-center shrink-0" style={{ gap: 36, marginBottom: 32 }}>
          <img
            src={teamLogoSrc(player.id)}
            alt=""
            style={{
              width: 200,
              height: 200,
              objectFit: "contain",
              borderRadius: 24,
              backgroundColor: "rgba(2,6,23,0.85)",
              padding: 20,
              border: "2px solid rgba(100,116,139,0.5)",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: 20,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: 10,
              }}
            >
              Sezon 2025/26
            </p>
            <h1
              style={{
                fontFamily: "Oswald, Impact, sans-serif",
                fontSize: 62,
                fontWeight: 700,
                lineHeight: 1,
                textTransform: "uppercase",
                wordBreak: "break-word",
              }}
            >
              {content.headline}
            </h1>
            <p style={{ fontSize: 28, color: "#cbd5e1", marginTop: 14, lineHeight: 1.3 }}>{content.subLine}</p>
          </div>
        </div>

        {/* Główna statystyka — duży blok */}
        <div
          className="shrink-0 flex flex-col items-center justify-center text-center"
          style={{
            borderRadius: 24,
            padding: "40px 32px",
            marginBottom: 28,
            backgroundColor: `${accent}18`,
            border: `2px solid ${accent}45`,
            minHeight: 200,
          }}
        >
          <p
            style={{
              fontFamily: "Oswald, Impact, sans-serif",
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1,
              color: accent,
            }}
          >
            {content.statLine}
          </p>
          <div
            className="flex flex-wrap justify-center"
            style={{ gap: 16, marginTop: 28, width: "100%" }}
          >
            {[
              { label: "H2H", value: `#${player.rank}` },
              { label: "Pkt lig.", value: String(player.pts) },
              { label: "Score", value: String(player.score) },
              { label: "Bilans", value: `${player.w}W–${player.d}D–${player.l}L` },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  padding: "14px 22px",
                  borderRadius: 16,
                  backgroundColor: "rgba(2,6,23,0.65)",
                  border: "1px solid rgba(51,65,85,0.8)",
                  minWidth: 120,
                }}
              >
                <p style={{ fontSize: 16, letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" }}>
                  {label}
                </p>
                <p style={{ fontSize: 30, fontWeight: 700, color: "#e2e8f0", marginTop: 4 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cytat — wypełnia resztę */}
        {content.quote ? (
          <div
            className="flex-1 flex items-center"
            style={{
              borderRadius: 20,
              padding: "28px 32px",
              backgroundColor: "rgba(15,23,42,0.75)",
              borderLeft: `6px solid ${accent}`,
              marginBottom: 20,
              minHeight: 140,
            }}
          >
            <blockquote
              style={{
                fontSize: 34,
                lineHeight: 1.35,
                color: "#cbd5e1",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              „{content.quote}"
            </blockquote>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <p
          style={{
            fontSize: 18,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#64748b",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Igrzyska Kapci Kłapcia · FPL Arena
        </p>
      </div>
    </div>
  );
};
