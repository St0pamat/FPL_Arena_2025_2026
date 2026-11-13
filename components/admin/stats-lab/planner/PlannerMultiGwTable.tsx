"use client";

import { Fragment, useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import {
  formatTenthsAsPounds,
  plannerSourceLabel,
  pt,
  ptTip,
  type PlannerChipType,
} from "@/lib/stats-lab/plannerI18n";
import {
  actionAria,
  formatBenchSlotLabel,
  lockedProfitTenths,
} from "@/lib/stats-lab/plannerUiFormat";
import {
  captainArmbandKind,
  captainArmbandLabel,
  formatFixturePills,
} from "@/lib/stats-lab/plannerFixtureUi";
import { shellLabel } from "@/lib/stats-lab/i18n";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";

export type MultiGwTableMetric =
  | "FIXTURE_XPTS"
  | "XPTS_HEATMAP"
  | "EXPECTED_MINS"
  | "PRICES_TABLE";

export type PlannerMultiGwTableProps = {
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  availableGameweeks: number[];
  squadPicks: ReconstructedSquadPick[];
  playersById: Map<number, PlannerPlayerCatalogItem>;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  activeChip?: PlannerChipType | null;
  metric?: MultiGwTableMetric;
  onMetricChange?: (m: MultiGwTableMetric) => void;
  onOpenPlayerInfo: (elementId: number) => void;
};

function fdrBg(level: number, isLight: boolean): string {
  if (isLight) {
    if (level <= 1) return "bg-emerald-600 text-white";
    if (level === 2) return "bg-emerald-100 text-emerald-950";
    if (level === 3) return "bg-slate-200 text-slate-900";
    if (level === 4) return "bg-amber-200 text-amber-950";
    return "bg-rose-600 text-white";
  }
  if (level <= 1) return "bg-emerald-500/30 text-emerald-100";
  if (level === 2) return "bg-emerald-500/20 text-emerald-100";
  if (level === 3) return "bg-slate-500/30 text-slate-100";
  if (level === 4) return "bg-amber-500/25 text-amber-100";
  return "bg-rose-500/30 text-rose-100";
}

function xPtsHeatClass(x: number, isLight: boolean): string {
  if (x >= 7) {
    return isLight
      ? "bg-emerald-600 text-white"
      : "bg-emerald-500/40 text-emerald-50";
  }
  if (x >= 5) {
    return isLight
      ? "bg-emerald-200 text-emerald-950"
      : "bg-emerald-500/25 text-emerald-100";
  }
  if (x >= 3) {
    return isLight
      ? "bg-slate-200 text-slate-900"
      : "bg-slate-500/25 text-slate-100";
  }
  if (x > 0) {
    return isLight
      ? "bg-amber-100 text-amber-950"
      : "bg-amber-500/20 text-amber-100";
  }
  return isLight
    ? "bg-slate-100 text-slate-500"
    : "bg-slate-900 text-slate-400";
}

function benchLabel(slot: number, lang: StatsLabLang): string {
  return formatBenchSlotLabel(lang, slot);
}

export function PlannerMultiGwTable({
  themeId,
  lang,
  availableGameweeks,
  squadPicks,
  playersById,
  projectionsByElement,
  activeChip = null,
  metric: metricProp,
  onMetricChange,
  onOpenPlayerInfo,
}: PlannerMultiGwTableProps) {
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const [metricLocal, setMetricLocal] =
    useState<MultiGwTableMetric>("FIXTURE_XPTS");
  const metric = metricProp ?? metricLocal;

  function setMetric(m: MultiGwTableMetric) {
    onMetricChange?.(m);
    if (metricProp == null) setMetricLocal(m);
  }

  const sortedPicks = useMemo(
    () => [...squadPicks].sort((a, b) => a.slot - b.slot),
    [squadPicks],
  );
  const xi = sortedPicks.filter((p) => p.slot >= 1 && p.slot <= 11);
  const bench = sortedPicks.filter((p) => p.slot >= 12 && p.slot <= 15);

  const metricOptions: Array<{ id: MultiGwTableMetric; label: string }> = [
  {
    id: "FIXTURE_XPTS",
    label: pt(lang, "planner.horizon.tab.fixturesPts"),
  },
  {
    id: "XPTS_HEATMAP",
    label: pt(lang, "planner.horizon.tab.ptsOnly"),
  },
  {
    id: "EXPECTED_MINS",
    label: pt(lang, "planner.horizon.tab.minutes"),
  },
  {
    id: "PRICES_TABLE",
    label: pt(lang, "planner.horizon.tab.prices"),
  },
];

  return (
    <section className={`rounded-2xl border p-3 sm:p-4 ${chrome.panel}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-sm font-black ${chrome.text}`}>
            {pt(lang, "planner.horizon.title")}
          </h3>
          <p className={`text-[10px] font-semibold ${chrome.mutedLabel}`}>
            {pt(lang, "planner.horizon.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {metricOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMetric(o.id)}
              className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase ${
                metric === o.id ? chrome.activeBtn : chrome.inactiveBtn
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {metric === "PRICES_TABLE" ? (
        <PricesTable
          chrome={chrome}
          isLight={isLight}
          lang={lang}
          xi={xi}
          bench={bench}
          playersById={playersById}
          onOpenPlayerInfo={onOpenPlayerInfo}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
            <thead>
              <tr className={chrome.mutedLabel}>
                <th className="sticky left-0 z-[1] min-w-[140px] px-2 py-2 font-black uppercase backdrop-blur-sm">
                  {pt(lang, "planner.market.players")}
                </th>
                {availableGameweeks.map((gw) => (
                  <th
                    key={gw}
                    className="min-w-[72px] px-1.5 py-2 text-center font-black"
                  >
                    GW{gw}
                  </th>
                ))}
                <th className="min-w-[72px] px-2 py-2 text-center font-black">
                  {pt(lang, "planner.xpts.horizonSum", {
                    from: availableGameweeks[0] ?? 0,
                    to:
                      availableGameweeks[availableGameweeks.length - 1] ?? 0,
                  })}
                </th>
                <th className="min-w-[56px] px-2 py-2 text-center font-black">
                  {pt(lang, "planner.horizon.matches")}
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionLabel
                chrome={chrome}
                colSpan={availableGameweeks.length + 3}
                label={pt(lang, "planner.horizon.startingXi")}
              />
              {xi.map((pick) => (
                <PlayerRow
                  key={pick.slot}
                  lang={lang}
                  pick={pick}
                  chrome={chrome}
                  isLight={isLight}
                  metric={metric}
                  availableGameweeks={availableGameweeks}
                  playersById={playersById}
                  projectionsByElement={projectionsByElement}
                  activeChip={activeChip}
                  onOpenPlayerInfo={onOpenPlayerInfo}
                  roleBadge={
                    captainArmbandLabel(
                      lang,
                      captainArmbandKind({
                        isCaptain: pick.isCaptain,
                        isViceCaptain: pick.isViceCaptain,
                        activeChip,
                      }),
                    ) || null
                  }
                />
              ))}
              <SectionLabel
                chrome={chrome}
                colSpan={availableGameweeks.length + 3}
                label={pt(lang, "planner.horizon.bench")}
              />
              {bench.map((pick) => (
                <PlayerRow
                  key={pick.slot}
                  lang={lang}
                  pick={pick}
                  chrome={chrome}
                  isLight={isLight}
                  metric={metric}
                  availableGameweeks={availableGameweeks}
                  playersById={playersById}
                  projectionsByElement={projectionsByElement}
                  activeChip={activeChip}
                  onOpenPlayerInfo={onOpenPlayerInfo}
                  roleBadge={benchLabel(pick.slot, lang)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SectionLabel({
  chrome,
  colSpan,
  label,
}: {
  chrome: ReturnType<typeof getStatsLabMenuChrome>;
  colSpan: number;
  label: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`px-2 py-1.5 text-[10px] font-black uppercase tracking-wider ${chrome.group} ${chrome.mutedLabel}`}
      >
        {label}
      </td>
    </tr>
  );
}

function PlayerRow({
  lang,
  pick,
  chrome,
  isLight,
  metric,
  availableGameweeks,
  playersById,
  projectionsByElement,
  activeChip,
  onOpenPlayerInfo,
  roleBadge,
}: {
  lang: StatsLabLang;
  pick: ReconstructedSquadPick;
  chrome: ReturnType<typeof getStatsLabMenuChrome>;
  isLight: boolean;
  metric: Exclude<MultiGwTableMetric, "PRICES_TABLE">;
  availableGameweeks: number[];
  playersById: Map<number, PlannerPlayerCatalogItem>;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  activeChip: PlannerChipType | null;
  onOpenPlayerInfo: (elementId: number) => void;
  roleBadge: string | null;
}) {
  const player = playersById.get(pick.elementId);
  let sumX = 0;
  let matchCount = 0;
  for (const gw of availableGameweeks) {
    const p = projectionsByElement[pick.elementId]?.[gw];
    sumX += p?.xPts ?? 0;
    if (p && !p.isBlank) {
      matchCount += p.fixtures?.length || (p.isDouble ? 2 : 1);
    }
  }

  const capMult =
    pick.isCaptain ? (activeChip === "3xc" ? 3 : 2) : 1;

  return (
    <tr
      className={`border-t ${
        isLight ? "border-slate-200" : "border-slate-800"
      }`}
    >
      <td
        className={`sticky left-0 z-[1] px-2 py-1.5 backdrop-blur-sm ${
          isLight ? "bg-white/95" : "bg-slate-950/95"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div className="relative h-7 w-7 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fplLabPlayerPhotoUrl(player?.player_code ?? 0)}
              alt=""
              crossOrigin="anonymous"
              className="h-7 w-7 rounded-full object-cover object-top"
            />
            {player?.club_pulse_code ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fplLabBadgeUrl(player.club_pulse_code)}
                alt=""
                crossOrigin="anonymous"
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-black/40 object-contain"
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenPlayerInfo(pick.elementId)}
            className="min-w-0 text-left"
            aria-label={
              player?.web_name
                ? `${player.web_name}${player.club_short_name ? `, ${player.club_short_name}` : ""}`
                : undefined
            }
          >
            <p className={`text-[11px] font-bold leading-tight ${chrome.text}`}>
              {player?.web_name ?? `#${pick.elementId}`}
              {roleBadge ? (
                <span
                  aria-hidden
                  className={`ml-1 inline-flex rounded px-1 text-[8px] font-black ${
                    isLight
                      ? "bg-amber-200 text-amber-950"
                      : "bg-amber-400 text-slate-950"
                  }`}
                >
                  {roleBadge}
                </span>
              ) : null}
            </p>
            <p className={`text-[9px] font-semibold ${chrome.mutedLabel}`}>
              {player?.club_short_name ?? "—"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onOpenPlayerInfo(pick.elementId)}
            aria-label={actionAria(
              lang,
              "planner.action.info",
              player?.web_name ?? `#${pick.elementId}`,
            )}
            className={`rounded-lg p-1 ${chrome.inactiveBtn}`}
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
      </td>

      {availableGameweeks.map((gw) => {
        const proj = projectionsByElement[pick.elementId]?.[gw];
        return (
          <td key={gw} className="px-1 py-1 align-middle">
            <GwCell
              lang={lang}
              metric={metric}
              proj={proj}
              isLight={isLight}
              capMult={capMult}
              isCaptain={pick.isCaptain}
              activeChip={activeChip}
            />
          </td>
        );
      })}

      <td className={`px-2 py-1.5 text-center text-xs font-black tabular-nums ${chrome.text}`}>
        {(sumX * (pick.isCaptain && metric === "XPTS_HEATMAP" ? capMult : 1)).toFixed(1)}
      </td>
      <td className={`px-2 py-1.5 text-center text-xs font-bold tabular-nums ${chrome.mutedLabel}`}>
        {matchCount}
      </td>
    </tr>
  );
}

function GwCell({
  lang,
  metric,
  proj,
  isLight,
  capMult,
  isCaptain,
  activeChip,
}: {
  lang: StatsLabLang;
  metric: Exclude<MultiGwTableMetric, "PRICES_TABLE">;
  proj: PlayerGwProjection | undefined;
  isLight: boolean;
  capMult: number;
  isCaptain: boolean;
  activeChip: PlannerChipType | null;
}) {
  if (!proj) {
    return (
      <div
        className={`rounded-lg px-1 py-1.5 text-center text-[9px] font-bold ${
          isLight ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-slate-500"
        }`}
      >
        {shellLabel(lang, "common.emdash")}
      </div>
    );
  }

  if (metric === "EXPECTED_MINS") {
    const mins = proj.expectedMinutes ?? 0;
    const p60 = (proj.p60 ?? 0) * 100;
    return (
      <div
        className={`rounded-lg px-1 py-1.5 text-center ${
          isLight ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-slate-100"
        }`}
      >
        <p className="text-[10px] font-black tabular-nums">
          {mins.toFixed(0)} min
        </p>
        <p className="text-[8px] font-semibold opacity-80">
          {p60.toFixed(0)}% ≥60&apos;
        </p>
      </div>
    );
  }

  if (metric === "XPTS_HEATMAP") {
    if (proj.isBlank) {
      return (
        <div
          className={`rounded-lg px-1 py-1.5 text-center text-[9px] font-bold ${
            isLight ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-slate-400"
          }`}
        >
          {pt(lang, "planner.fixture.bgw.player")}
        </div>
      );
    }
    const shown = proj.xPts * (isCaptain ? capMult : 1);
    return (
      <div
        className={`rounded-lg px-1 py-1.5 text-center ${xPtsHeatClass(shown, isLight)}`}
      >
        <p className="text-[11px] font-black tabular-nums">
          {shown.toFixed(1)}
        </p>
        {isCaptain ? (
          <p className="text-[8px] font-black">
            {activeChip === "3xc" ? "TC ×3" : "C ×2"}
          </p>
        ) : null}
      </div>
    );
  }

  // FIXTURE_XPTS — kolory FDR bez zmian; tylko tekst pigułki przez helper UI
  const fx = proj.fixtures?.[0];
  const pills = formatFixturePills(lang, proj);
  const hasMatchPill = pills.some((p) => p.kind === "match");
  return (
    <div
      className={`rounded-lg border border-transparent px-1 py-1 text-center ${
        proj.isBlank
          ? isLight
            ? "bg-slate-100 text-slate-600"
            : "bg-slate-900 text-slate-400"
          : fdrBg(fx?.fdrLevel ?? 3, isLight)
      }`}
    >
      <p
        className="whitespace-nowrap text-[11px] font-black leading-tight"
        title={hasMatchPill ? ptTip(lang, "planner.fixture.venueTip") : undefined}
      >
        {pills.map((p) => p.label).join(" · ")}
      </p>
      <p className="mt-0.5 text-[10px] font-black tabular-nums">
        {proj.isBlank
          ? pt(lang, "planner.fixture.bgw.player")
          : `${proj.xPts.toFixed(1)} ${shellLabel(lang, "common.pts")}`}
      </p>
    </div>
  );
}

function PricesTable({
  chrome,
  isLight,
  lang,
  xi,
  bench,
  playersById,
  onOpenPlayerInfo,
}: {
  chrome: ReturnType<typeof getStatsLabMenuChrome>;
  isLight: boolean;
  lang: StatsLabLang;
  xi: ReconstructedSquadPick[];
  bench: ReconstructedSquadPick[];
  playersById: Map<number, PlannerPlayerCatalogItem>;
  onOpenPlayerInfo: (elementId: number) => void;
}) {
  const ppShort = pt(lang, "planner.price.purchase.short");
  const cpShort = pt(lang, "planner.price.current.short");
  const spShort = pt(lang, "planner.price.selling.short");
  const rows = [
    {
      label: pt(lang, "planner.horizon.startingXi"),
      picks: xi,
    },
    {
      label: pt(lang, "planner.horizon.bench"),
      picks: bench,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
        <thead>
          <tr className={chrome.mutedLabel}>
            <th className="px-2 py-2 font-black uppercase">
              {pt(lang, "planner.market.players")}
            </th>
            <th className="px-2 py-2 font-black" title={pt(lang, "planner.price.purchase")}>
              {ppShort}
            </th>
            <th className="px-2 py-2 font-black" title={pt(lang, "planner.price.current")}>
              {cpShort}
            </th>
            <th className="px-2 py-2 font-black" title={pt(lang, "planner.price.selling")}>
              {spShort}
            </th>
            <th
              className="px-2 py-2 font-black"
              title={ptTip(lang, "planner.horizon.lockedProfit")}
            >
              {pt(lang, "planner.horizon.lockedProfit")}
            </th>
            <th className="px-2 py-2 font-black">
              {pt(lang, "planner.horizon.priceSource")}
            </th>
            <th className="px-2 py-2 font-black">
              {pt(lang, "planner.price.dropColumn")}
            </th>
            <th className="px-2 py-2 font-black">i</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((section) => (
            <Fragment key={section.label}>
              <tr>
                <td
                  colSpan={8}
                  className={`px-2 py-1.5 text-[10px] font-black uppercase ${chrome.group} ${chrome.mutedLabel}`}
                >
                  {section.label}
                </td>
              </tr>
              {section.picks.map((pick) => {
                const player = playersById.get(pick.elementId);
                const profit = lockedProfitTenths(
                  pick.purchasePriceTenths,
                  pick.sellingPriceTenths,
                );
                return (
                  <tr
                    key={pick.slot}
                    className={`border-t ${
                      isLight ? "border-slate-200" : "border-slate-800"
                    }`}
                  >
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenPlayerInfo(pick.elementId)}
                        className={`text-left text-[11px] font-bold ${chrome.text}`}
                      >
                        {player?.web_name ?? `#${pick.elementId}`}
                        {pick.slot >= 12 ? (
                          <span className={`ml-1 text-[9px] ${chrome.mutedLabel}`}>
                            {benchLabel(pick.slot, lang)}
                          </span>
                        ) : pick.isCaptain ? (
                          <span className="ml-1 text-[9px] font-black text-amber-400">
                            C
                          </span>
                        ) : pick.isViceCaptain ? (
                          <span className="ml-1 text-[9px] font-black">V</span>
                        ) : null}
                      </button>
                    </td>
                    <td className={`px-2 py-1.5 font-bold tabular-nums ${chrome.text}`}>
                      {formatTenthsAsPounds(pick.purchasePriceTenths)}
                    </td>
                    <td className={`px-2 py-1.5 font-bold tabular-nums ${chrome.text}`}>
                      {formatTenthsAsPounds(pick.nowCostTenths)}
                    </td>
                    <td className={`px-2 py-1.5 font-bold tabular-nums ${chrome.text}`}>
                      {formatTenthsAsPounds(pick.sellingPriceTenths)}
                    </td>
                    <td
                      className={`px-2 py-1.5 font-bold tabular-nums ${
                        profit > 0
                          ? isLight
                            ? "text-emerald-700"
                            : "text-emerald-300"
                          : chrome.mutedLabel
                      }`}
                    >
                      {formatTenthsAsPounds(profit)}
                    </td>
                    <td className={`px-2 py-1.5 font-semibold ${chrome.mutedLabel}`}>
                      {plannerSourceLabel(lang, pick.priceSource)}
                    </td>
                    <td className="px-2 py-1.5 font-bold">
                      {pick.willDropAffectSell ? (
                        <span
                          className={
                            isLight ? "text-amber-700" : "text-amber-300"
                          }
                        >
                          ⚠️ SP
                        </span>
                      ) : (
                        <span
                          className={
                            isLight ? "text-emerald-700" : "text-emerald-300"
                          }
                        >
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenPlayerInfo(pick.elementId)}
                        aria-label={actionAria(
                          lang,
                          "planner.action.info",
                          player?.web_name ?? `#${pick.elementId}`,
                        )}
                        className={`rounded-lg p-1 ${chrome.inactiveBtn}`}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
