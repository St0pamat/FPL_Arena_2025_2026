import { useMemo } from "react";
import type { PlayerHighlights } from "@/types/highlights";
import type { SeasonGwDetail } from "@/types/seasonHistory";
import type { FplElementMap } from "@/types/fpl";
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  H2H_ICON,
  H2H_PL,
  POSITION_COLORS,
} from "@/features/fpl/constants";
import { StatPill, InsightCard } from "@/components/ui";
import { TeamOfSeasonPanel } from "@/features/pitch/components/TeamOfSeasonPanel";

export const SeasonHighlightsPanel = ({
  highlights,
  fplPlayersById = {},
  seasonGwDetails = [],
}: {
  highlights: PlayerHighlights | null;
  fplPlayersById?: Record<number, { web_name?: string }>;
  seasonGwDetails?: SeasonGwDetail[];
}) => {
    if (!highlights || !highlights.gwPoints || highlights.gwPoints.length === 0) return null;

    const maxPts = Math.max(...highlights.gwPoints.map((g) => g.points), 1);
    const h2h = highlights.h2hStreaks || {};
    const wins = highlights.gwPoints.filter((g) => g.h2hOutcome === "W").length;
    const losses = highlights.gwPoints.filter((g) => g.h2hOutcome === "L").length;
    const draws = highlights.gwPoints.filter((g) => g.h2hOutcome === "D").length;

    const goodInsights = [];
    const badInsights = [];

    (highlights.bestGWs || []).forEach((g) => {
        goodInsights.push({
            key: `best-${g.gw}`,
            icon: "🔥",
            title: `Najlepsza kolejka sezonu: nr ${g.gw}`,
            detail: "Tyle punktów FPL udało się zdobyć w jeden weekend — szczyt formy.",
            badge: `${g.points} pkt`,
            tone: "good"
        });
    });

    (highlights.topGains || []).slice(0, 3).forEach((p) => {
        goodInsights.push({
            key: `gain-${p.name}`,
            icon: "⭐",
            title: `${p.name} — bohater sezonu`,
            detail: "Ten zawodnik dał ci największą przewagę nad przeciętnym menedżerem w lidze.",
            badge: `+${p.net} pkt`,
            tone: "good"
        });
    });

    (highlights.bestTransfers || []).slice(0, 3).forEach((t) => {
        goodInsights.push({
            key: `bt-${t.gw}-${t.bought}`,
            icon: "🔄",
            title: `Trafiony transfer (kolejka ${t.gw})`,
            detail: `Wypchnąłeś ${t.sold} i wprowadziłeś ${t.bought}. Decyzja się zwróciła.`,
            badge: `+${t.rpDiff} pkt`,
            tone: "good"
        });
    });

    (highlights.gainMoments || []).slice(0, 2).forEach((m) => {
        goodInsights.push({
            key: `gm-${m.gw}-${m.name}`,
            icon: "🎯",
            title: `Szczęśliwy strzał: ${m.name} (kolejka ${m.gw})`,
            detail: "Zawodnik zagrał znacznie lepiej, niż przewidywały statystyki.",
            badge: `+${m.diff} pkt`,
            tone: "good"
        });
    });

    if (highlights.biggestWin) {
        const b = highlights.biggestWin;
        goodInsights.push({
            key: "bigwin",
            icon: "🏆",
            title: `Największe zwycięstwo w lidze H2H (kolejka ${b.gw})`,
            detail: `Wynik ${b.score} przeciwko ${b.opponent}. Rywal nie miał szans.`,
            badge: `+${b.margin} różnicy`,
            tone: "good"
        });
    }

    (highlights.worstGWs || []).forEach((g) => {
        badInsights.push({
            key: `worst-${g.gw}`,
            icon: "🌧️",
            title: `Najgorsza kolejka: nr ${g.gw}`,
            detail: "Weekend do szybkiego zapomnienia — mało punktów FPL.",
            badge: `${g.points} pkt`,
            tone: "bad"
        });
    });

    (highlights.topLosses || []).slice(0, 3).forEach((p) => {
        badInsights.push({
            key: `loss-${p.name}`,
            icon: "💸",
            title: `${p.name} — rozczarowanie sezonu`,
            detail: "Ten wybór kosztował cię najwięcej w porównaniu z innymi menedżerami.",
            badge: `${p.net} pkt`,
            tone: "bad"
        });
    });

    (highlights.worstTransfers || []).slice(0, 3).forEach((t) => {
        badInsights.push({
            key: `wt-${t.gw}-${t.bought}`,
            icon: "🚫",
            title: `Nietrafiony transfer (kolejka ${t.gw})`,
            detail: `${t.sold} → ${t.bought}. Ten ruch nie wyszedł.`,
            badge: `${t.rpDiff} pkt`,
            tone: "bad"
        });
    });

    (highlights.lossMoments || []).slice(0, 2).forEach((m) => {
        badInsights.push({
            key: `lm-${m.gw}-${m.name}`,
            icon: "😤",
            title: `Zawiedziony wybór: ${m.name} (kolejka ${m.gw})`,
            detail: "Zawodnik zagrał poniżej oczekiwań statystycznych.",
            badge: `${m.diff} pkt`,
            tone: "bad"
        });
    });

    if (highlights.heaviestLoss) {
        const l = highlights.heaviestLoss;
        badInsights.push({
            key: "bigloss",
            icon: "💀",
            title: `Najcięższa porażka H2H (kolejka ${l.gw})`,
            detail: `${l.score} przeciwko ${l.opponent}.`,
            badge: `${l.margin} różnicy`,
            tone: "bad"
        });
    }

    const last5Labels = (h2h.last5 || []).map((o) => H2H_PL[o] || o);
    const gwDetailByGw = Object.fromEntries((seasonGwDetails || []).map((gd) => [gd.gw, gd]));

    return (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl w-full space-y-8">
            <div className="border-b border-slate-800/60 pb-5">
                <h4 className="text-2xl font-athletic font-bold text-white uppercase tracking-wide">Twój sezon w pigułce</h4>
                <p className="text-sm text-slate-400 mt-2 max-w-3xl">
                    Przejrzyste podsumowanie: co wyszło, co bolało i jak wyglądała forma w każdej z 38 kolejek.
                    Bez tabel Excela — same konkrety.
                </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <StatPill label="Średnio na kolejkę" value={`${highlights.avgGwPoints}`} sub="punktów FPL" tone="info" />
                <StatPill label="Wygrane H2H" value={wins} sub="w lidze Areny" tone="good" />
                <StatPill label="Porażki H2H" value={losses} sub="w lidze Areny" tone="bad" />
                {draws > 0 && <StatPill label="Remisy H2H" value={draws} tone="neutral" />}
                {h2h.maxWins != null && <StatPill label="Najdłuższa seria" value={h2h.maxWins} sub="wygranych z rzędu" tone="good" />}
                {highlights.totalBench > 0 && (
                    <StatPill label="Zmarnowane na ławce" value={highlights.totalBench} sub="pkt przez cały sezon" tone="warn" />
                )}
            </div>

            <div>
                <h5 className="text-sm font-bold text-white mb-1">Mapa sezonu — 38 kolejek</h5>
                <p className="text-xs text-slate-400 mb-3">
                    Wyższy zielony pasek = więcej punktów FPL. Ramka: <span className="text-emerald-400">wygrana</span> / <span className="text-slate-400">remis</span> / <span className="text-red-400">porażka</span> w meczu ligi H2H.
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-[repeat(19,minmax(0,1fr))] lg:grid-cols-[repeat(38,minmax(0,1fr))] gap-1.5">
                    {highlights.gwPoints.map((g) => {
                        const barH = Math.max(20, Math.round((g.points / maxPts) * 100));
                        const borderColor = g.h2hOutcome === "W"
                            ? "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                            : g.h2hOutcome === "L"
                            ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]"
                            : "border-slate-500";
                        const extra = gwDetailByGw[g.gw];
                        const vsElite = extra?.vsTop10k != null
                            ? ` | vs Top10k: ${extra.vsTop10k > 0 ? "+" : ""}${extra.vsTop10k}`
                            : "";
                        const cap = extra?.captain ? ` | C: ${extra.captain}` : "";
                        return (
                            <div
                                key={g.gw}
                                title={`Kolejka ${g.gw}: ${g.points} pkt FPL${vsElite}${cap}${g.opponent ? ` | vs ${g.opponent}` : ""}${g.h2hOutcome ? ` | ${H2H_PL[g.h2hOutcome]}` : ""}`}
                                className={`rounded-lg border-2 bg-slate-950/80 p-1 flex flex-col items-center min-h-[64px] ${borderColor}`}
                            >
                                <span className="text-[9px] text-slate-500 font-mono">{g.gw}</span>
                                <div className="w-full flex-1 flex items-end justify-center my-0.5 min-h-[28px]">
                                    <div
                                        className="w-3/4 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                                        style={{ height: `${barH}%`, minHeight: "4px" }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-white leading-none">{g.points}</span>
                                {g.h2hOutcome && (
                                    <span className={`text-[9px] font-bold mt-0.5 ${g.h2hOutcome === "W" ? "text-emerald-400" : g.h2hOutcome === "L" ? "text-red-400" : "text-slate-400"}`}>
                                        {H2H_ICON[g.h2hOutcome]}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {last5Labels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300">Ostatnie 5 kolejek H2H:</span>
                        {last5Labels.map((label, i) => (
                            <span key={i} className={`px-2 py-1 rounded-md font-semibold ${label === "Wygrana" ? "bg-emerald-500/20 text-emerald-300" : label === "Porażka" ? "bg-red-500/20 text-red-300" : "bg-slate-700 text-slate-300"}`}>
                                {label}
                            </span>
                        ))}
                        {highlights.seasonSplit && (
                            <span className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                Jesień {highlights.seasonSplit.firstHalfAvg} pkt → Wiosna {highlights.seasonSplit.secondHalfAvg} pkt / kolejkę
                            </span>
                        )}
                    </div>
                )}
            </div>

            {(highlights.pointsByPosition?.length > 0 || highlights.pointSources?.length > 0) && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/30 p-5 md:p-6 space-y-6">
                    <div>
                        <h5 className="text-lg font-athletic font-bold text-white uppercase tracking-wide">Mapa punktów sezonu</h5>
                        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                            Rozkład z analizy Excel (arkusze Event Points Total i GW Picks) — widać, skąd wzięły się punkty FPL: według pozycji w składzie oraz według zdarzeń punktowanych w grze.
                        </p>
                    </div>

                    {highlights.pointsByPosition?.length > 0 && (
                        <div>
                            <h6 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                                <span>🧩</span> Punkty według pozycji w składzie
                            </h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {highlights.pointsByPosition.map((pos) => {
                                    const style = POSITION_COLORS[pos.position] || POSITION_COLORS[3];
                                    return (
                                        <div key={pos.position} className={`rounded-xl border p-4 ${style.border} ${style.bg}`}>
                                            <div className={`text-fluid-xs uppercase tracking-widest font-mono ${style.text}`}>{pos.label}</div>
                                            <div className="text-2xl font-athletic font-bold text-white mt-1">{pos.points} pkt</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{pos.pct}% całego składu</div>
                                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden mt-3">
                                                <div className={`h-full bg-gradient-to-r ${style.bar} rounded-full`} style={{ width: `${Math.min(100, pos.pct)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {highlights.pointSources?.length > 0 && (
                        <div>
                            <h6 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                                <span>📋</span> Punkty według zdarzeń FPL
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {highlights.pointSources.map((s) => {
                                    const positive = s.points >= 0;
                                    const barPct = s.pct != null ? Math.min(100, Math.abs(s.pct)) : Math.min(100, Math.abs(s.points) / 25);
                                    return (
                                        <div
                                            key={s.type}
                                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                                positive ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/25 bg-red-500/5"
                                            }`}
                                        >
                                            <span className="text-lg shrink-0 w-7 text-center" title={s.type}>
                                                {EVENT_TYPE_ICONS[s.type] || "•"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between gap-2 items-start">
                                                    <span className="text-xs text-slate-200 leading-snug">
                                                        {EVENT_TYPE_LABELS[s.type] || s.type}
                                                    </span>
                                                    <span className={`text-sm font-bold font-mono shrink-0 ${positive ? "text-emerald-400" : "text-red-400"}`}>
                                                        {s.points > 0 ? "+" : ""}{s.points}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1.5">
                                                    <div
                                                        className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`}
                                                        style={{ width: `${barPct}%` }}
                                                    />
                                                </div>
                                                {s.count != null && (
                                                    <div className="text-fluid-xs text-slate-500 mt-1 font-mono">
                                                        Zdarzenia w sezonie: {s.count}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-fluid-xs text-slate-500 mt-3 italic">
                                Zgodnie z zasadami FPL: m.in. występy, czyste konta, bramki, asysty, bonusy, defcon, obrony GK, kary za kartki, stracone gole, spalone karne.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h5 className="text-base font-bold text-emerald-400 mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">👍</span>
                        Co wyszło świetnie
                    </h5>
                    <div className="space-y-3">
                        {goodInsights.length > 0 ? goodInsights.map((item) => (
                            <InsightCard key={item.key} icon={item.icon} title={item.title} detail={item.detail} badge={item.badge} badgeTone={item.tone} />
                        )) : <p className="text-sm text-slate-500">Brak wyróżnionych pozycji.</p>}
                    </div>
                </div>
                <div>
                    <h5 className="text-base font-bold text-red-400 mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-lg">👎</span>
                        Co kosztowało najwięcej
                    </h5>
                    <div className="space-y-3">
                        {badInsights.length > 0 ? badInsights.map((item) => (
                            <InsightCard key={item.key} icon={item.icon} title={item.title} detail={item.detail} badge={item.badge} badgeTone={item.tone} />
                        )) : <p className="text-sm text-slate-500">Brak wyróżnionych pozycji.</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/60">
                {highlights.chips && highlights.chips.length > 0 && (
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">
                        <h5 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">🎴 Użyte chipy menedżera</h5>
                        <div className="space-y-2">
                            {highlights.chips.map((c) => (
                                <div key={`${c.gw}-${c.chip}`} className="flex justify-between items-center bg-slate-950/60 rounded-xl border border-purple-500/20 px-4 py-3">
                                    <div>
                                        <div className="text-xs text-slate-500">Kolejka {c.gw}</div>
                                        <div className="text-sm font-semibold text-white">{c.chipLabel}</div>
                                    </div>
                                    <div className="text-lg font-athletic font-bold text-purple-200">{c.points} pkt</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {highlights.formations && highlights.formations.length > 0 && (
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
                        <h5 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">📐 Ulubiony układ taktyczny</h5>
                        <div className="space-y-2">
                            {highlights.formations.map((f) => (
                                <div key={f.name} className="flex justify-between items-center bg-slate-950/60 rounded-xl border border-blue-500/20 px-4 py-3">
                                    <span className="text-lg font-athletic text-white">{f.name}</span>
                                    <span className="text-xs text-blue-200">{f.count} razy · średnio <strong>{f.avg}</strong> pkt</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {highlights.expSummary && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                        <h5 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">🎲 Czy trafiałeś w formę?</h5>
                        <p className="text-xs text-slate-400 mb-3">Porównanie z tym, ile punktów „powinien” dać skład według statystyk.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-950/60 rounded-xl p-4 text-center border border-emerald-500/30">
                                <div className="text-3xl font-athletic font-bold text-emerald-400">{highlights.expSummary.overperform}</div>
                                <div className="text-xs text-slate-400 mt-1">kolejek powyżej oczekiwań</div>
                            </div>
                            <div className="bg-slate-950/60 rounded-xl p-4 text-center border border-red-500/30">
                                <div className="text-3xl font-athletic font-bold text-red-400">{highlights.expSummary.underperform}</div>
                                <div className="text-xs text-slate-400 mt-1">kolejek poniżej oczekiwań</div>
                            </div>
                        </div>
                        {highlights.expSummary.best && (
                            <p className="text-xs text-slate-500 mt-3 text-center">
                                Największa pozytywna niespodzianka: kolejka {highlights.expSummary.best.gw} ({highlights.expSummary.best.diff > 0 ? "+" : ""}{highlights.expSummary.best.diff} pkt)
                            </p>
                        )}
                    </div>
                )}
            </div>

            {highlights.dreamTeam && highlights.dreamTeam.length > 0 && (
                <TeamOfSeasonPanel
                    dreamTeam={highlights.dreamTeam}
                    squadPlayers={highlights.squadPlayers}
                    fplPlayersById={fplPlayersById}
                />
            )}
        </div>
    );
};
