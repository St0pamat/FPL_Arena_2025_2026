import { LEAGUE_LOGO_SRC, teamLogoSrc } from "@arena/config/branding";
import type { Player } from "@arena/types/player";
import { playerDisplayName } from "@arena/lib/playerDisplay";
import { buildStoryPosterLines } from "@arena/features/centrum/lib/cardContent";
import type { PlayerHighlights } from "@arena/types/highlights";

const KPI = [
  { key: "rank", label: "Miejsce H2H", fmt: (d: ReturnType<typeof buildStoryPosterLines>) => `#${d.rank}` },
  { key: "pts", label: "Pkt ligowe", fmt: (d) => String(d.pts) },
  { key: "score", label: "Score FPL", fmt: (d) => String(d.score) },
  { key: "bestOr", label: "Najlepszy OR", fmt: (d) => d.bestOr },
  { key: "winStreak", label: "Seria win", fmt: (d) => d.winStreak },
  { key: "avgGw", label: "Śr. / GW", fmt: (d) => String(d.avgGw) },
] as const;

export const StoryPosterDocument = ({
  player,
  highlights,
}: {
  player: Player;
  highlights: PlayerHighlights | null;
}) => {
  const d = buildStoryPosterLines(player, highlights);
  const maxBar = d.maxGwBar || 1;

  return (
    <div
      className="relative overflow-hidden bg-[#0a0e17] text-white box-border"
      style={{ width: 1080, height: 1920, fontFamily: "system-ui, Segoe UI, sans-serif" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(16,185,129,0.22), transparent 52%), radial-gradient(ellipse 70% 35% at 0% 100%, rgba(59,130,246,0.16), transparent 48%)",
        }}
      />
      <div className="absolute inset-3 rounded-[28px] border-[3px] border-emerald-500/40 pointer-events-none" />
      <div className="absolute inset-6 rounded-[22px] border border-emerald-500/20 pointer-events-none opacity-50" />

      <div
        className="relative z-10 box-border flex flex-col"
        style={{ width: 1080, height: 1920, padding: "48px 44px 40px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{ marginBottom: 40 }}>
          <img src={LEAGUE_LOGO_SRC} alt="" style={{ height: 68, objectFit: "contain" }} />
          <p
            style={{
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#34d399",
              fontWeight: 700,
            }}
          >
            Mój sezon w liczbach
          </p>
        </div>

        {/* Profil */}
        <div className="flex items-center shrink-0" style={{ gap: 32, marginBottom: 36 }}>
          <img
            src={teamLogoSrc(player.id)}
            alt=""
            style={{
              width: 168,
              height: 168,
              objectFit: "contain",
              borderRadius: 24,
              backgroundColor: "rgba(2,6,23,0.85)",
              padding: 16,
              border: "2px solid rgba(16,185,129,0.35)",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "Oswald, Impact, sans-serif",
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.05,
                textTransform: "uppercase",
              }}
            >
              {player.team}
            </h1>
            <p style={{ fontSize: 28, color: "#94a3b8", marginTop: 10 }}>{playerDisplayName(player)}</p>
            <p style={{ fontSize: 24, color: "#64748b", marginTop: 8, letterSpacing: "0.08em" }}>{d.wdl}</p>
          </div>
        </div>

        {/* KPI grid */}
        <div
          className="grid grid-cols-2 shrink-0"
          style={{ gap: 18, marginBottom: 28 }}
        >
          {KPI.map(({ key, label, fmt }) => (
            <div
              key={key}
              style={{
                borderRadius: 18,
                padding: "22px 24px",
                backgroundColor: "rgba(2,6,23,0.72)",
                border: "1px solid rgba(51,65,85,0.85)",
              }}
            >
              <p style={{ fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase", color: "#64748b" }}>
                {label}
              </p>
              <p style={{ fontSize: 44, fontWeight: 700, color: "#34d399", marginTop: 6, lineHeight: 1 }}>{fmt(d)}</p>
            </div>
          ))}
        </div>

        {/* MVP + ekstrema */}
        <div className="grid grid-cols-3 shrink-0" style={{ gap: 16, marginBottom: 24 }}>
          <div
            style={{
              borderRadius: 18,
              padding: "20px 18px",
              backgroundColor: "rgba(2,6,23,0.72)",
              border: "1px solid rgba(51,65,85,0.85)",
            }}
          >
            <p style={{ fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase", color: "#34d399" }}>
              Kolejka MVP
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{d.bestGw}</p>
          </div>
          <div
            style={{
              borderRadius: 18,
              padding: "20px 18px",
              backgroundColor: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.35)",
            }}
          >
            <p style={{ fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase", color: "#34d399" }}>
              Szczyt
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>{d.bestGwLabel}</p>
          </div>
          <div
            style={{
              borderRadius: 18,
              padding: "20px 18px",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <p style={{ fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f87171" }}>
              Dołek
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>{d.worstGwLabel}</p>
          </div>
        </div>

        {/* Bohater / sabotażysta */}
        <div className="grid grid-cols-2 shrink-0" style={{ gap: 16, marginBottom: 28 }}>
          <div
            style={{
              borderRadius: 18,
              padding: "22px 24px",
              backgroundColor: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            <p style={{ fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase", color: "#34d399" }}>
              Bohater sezonu
            </p>
            <p style={{ fontSize: 30, fontWeight: 600, marginTop: 10, lineHeight: 1.25 }}>{d.hero}</p>
          </div>
          <div
            style={{
              borderRadius: 18,
              padding: "22px 24px",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.28)",
            }}
          >
            <p style={{ fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f87171" }}>
              Rozczarowanie
            </p>
            <p style={{ fontSize: 30, fontWeight: 600, marginTop: 10, lineHeight: 1.25 }}>{d.villain}</p>
          </div>
        </div>

        {/* Wykres — zajmuje resztę wysokości */}
        <div
          className="flex flex-col flex-1 min-h-0"
          style={{
            borderRadius: 20,
            padding: "24px 20px 20px",
            backgroundColor: "rgba(2,6,23,0.72)",
            border: "1px solid rgba(51,65,85,0.85)",
          }}
        >
          <div className="flex items-end justify-between shrink-0" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: "#64748b" }}>
              Mapa 38 kolejek
            </p>
            <p style={{ fontSize: 18, color: "#475569" }}>max {maxBar} pkt</p>
          </div>
          <div className="flex items-end flex-1" style={{ gap: 4, minHeight: 420 }}>
            {d.gwBars.map((pts, i) => {
              const isBest = i === d.bestGwIdx;
              const isWorst = i === d.worstGwIdx && d.worstGwIdx !== d.bestGwIdx;
              return (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-t"
                  style={{
                    height: `${Math.max(6, (pts / maxBar) * 100)}%`,
                    background: isBest
                      ? "linear-gradient(to top, #047857, #fbbf24)"
                      : isWorst
                        ? "linear-gradient(to top, #7f1d1d, #ef4444)"
                        : "linear-gradient(to top, #047857, #34d399)",
                  }}
                  title={`GW${i + 1}: ${pts}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between shrink-0" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 16, color: "#475569" }}>GW1</span>
            <span style={{ fontSize: 16, color: "#475569" }}>GW19</span>
            <span style={{ fontSize: 16, color: "#475569" }}>GW38</span>
          </div>
        </div>

        <p
          style={{
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#64748b",
            textAlign: "center",
            marginTop: 24,
            flexShrink: 0,
          }}
        >
          FPL Arena · Sezon 2025/26
        </p>
      </div>
    </div>
  );
};
