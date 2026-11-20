"use client";

import type { DragEvent, ReactNode } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import {
  getScatterClubColor,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import {
  formatTenthsAsPounds,
  pt,
  type PlannerChipType,
  type PlannerTileMetric,
} from "@/lib/stats-lab/plannerI18n";
import {
  captainArmbandAria,
  captainArmbandLabel,
  formatFixturePills,
  type CaptainArmbandKind,
} from "@/lib/stats-lab/plannerFixtureUi";
import {
  actionAria,
  cardDisplayedXPts,
  cardNextFdrDots,
  formatCardXPts,
  emptySlotBudgetText,
  formatPlayerTileAccessibleName,
} from "@/lib/stats-lab/plannerUiFormat";
import { fplLabBadgeUrl } from "@/lib/stats-lab/mediaUrls";
import { PlannerFixturePills } from "@/components/admin/stats-lab/planner/PlannerFixturePills";
import {
  fdrDotClass,
  fdrPillClass,
  plannerCardPalette,
} from "@/components/admin/stats-lab/planner/plannerCardPalette";
import "./plannerPlayerCard.css";

function safePounds(tenths: number | null | undefined): string {
  const n = Number(tenths);
  return formatTenthsAsPounds(Number.isFinite(n) ? n : 0);
}

/** Krótki zapis ceny na wąskiej karcie: 15.6 zamiast £15.6m. */
function shortTenths(tenths: number | null | undefined): string {
  const n = Number(tenths);
  if (!Number.isFinite(n)) return "0.0";
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${(Math.abs(rounded) / 10).toFixed(1)}`;
}

function shirtFill(
  color: string | null | undefined,
  clubShort: string | null | undefined,
): string {
  if (typeof color === "string") {
    const hex = color.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return hex;
  }
  // Sync zapisuje primary_color jako null. Paleta short_name jest tym samym źródłem co kropki klubów w Studio.
  return getScatterClubColor(clubShort, null, "#94a3b8");
}

function ClubShirt({ color }: { color?: string }) {
  const fill = color ?? "currentColor";
  return (
    <svg
      viewBox="0 0 60 56"
      aria-hidden="true"
      data-testid="club-shirt"
      data-shirt-fill={color ?? "currentColor"}
    >
      <path
        d="M18 3 L8 7 L1 18 L9 25 L13 21 L13 53 L47 53 L47 21 L51 25 L59 18 L52 7 L42 3 C38 9 22 9 18 3 Z"
        fill={fill}
      />
      <path
        d="M18 3 L8 7 L1 18 L9 25 L13 21 L14 9 Z M42 3 L52 7 L59 18 L51 25 L47 21 L46 9 Z"
        fill={fill}
        opacity="0.75"
      />
      <path
        d="M22 5 C26 9 34 9 38 5"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.35"
        strokeWidth="2.4"
      />
      <path
        d="M18 3 L8 7 L1 18 L9 25 L13 21 L13 53 L47 53 L47 21 L51 25 L59 18 L52 7 L42 3 C38 9 22 9 18 3 Z"
        fill="none"
        stroke="#0f172a"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
    </svg>
  );
}

function emptyPositionKey(slot: number): "planner.pos.gkp" | "planner.pos.def" | "planner.pos.mid" | "planner.pos.fwd" {
  if (slot === 1 || slot === 12) return "planner.pos.gkp";
  if (slot >= 2 && slot <= 5) return "planner.pos.def";
  if (slot >= 6 && slot <= 8) return "planner.pos.mid";
  if (slot >= 9 && slot <= 11) return "planner.pos.fwd";
  return "planner.pos.def";
}

export function PlannerEmptySlot({
  themeId,
  lang,
  slot,
  budgetTenths,
}: {
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  slot: number;
  /** Bank, albo bank + cena sprzedaży gracza do zejścia. Brak liczby = bez linii budżetu. */
  budgetTenths?: number;
}) {
  const palette = plannerCardPalette(themeId);
  const pos = pt(lang, emptyPositionKey(slot));
  const budget =
    budgetTenths == null ? null : emptySlotBudgetText(lang, budgetTenths);
  const label = budget
    ? `${pt(lang, "planner.pitch.emptyAdd", { pos })}. ${budget}`
    : pt(lang, "planner.pitch.emptyAdd", { pos });
  return (
    <div
      role="group"
      aria-label={label}
      data-testid="empty-slot"
      className={`ppc-empty ${palette.empty}`}
    >
      <span className="ppc-empty-plus" aria-hidden="true">
        +
      </span>
      <b className="ppc-empty-title" data-allow-ellipsis="1">
        {pt(lang, "planner.pitch.emptySlot")}
      </b>
      <b className="ppc-empty-sub">
        {pos}
        {budget ? <span className="ppc-empty-budget"> · {budget}</span> : null}
      </b>
    </div>
  );
}

export type PlannerPlayerCardProps = {
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  isLight: boolean;
  isExporting: boolean;
  pick: ReconstructedSquadPick;
  player: PlannerPlayerCatalogItem | undefined;
  proj: PlayerGwProjection | undefined;
  projectionsForElement: Record<number, PlayerGwProjection> | undefined;
  currentGw: number;
  tileMetric: PlannerTileMetric;
  activeChip: PlannerChipType | null;
  armbandKind: CaptainArmbandKind;
  playerName: string;
  fullName: string;
  benchAccessibleLabel?: string;
  ringClass?: string;
  onSell: () => void;
  onSwap: () => void;
  onInfo: () => void;
  onOpenActions: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
};

export function PlannerPlayerCard({
  themeId,
  lang,
  isLight,
  isExporting,
  pick,
  player,
  proj,
  projectionsForElement,
  currentGw,
  tileMetric,
  activeChip,
  armbandKind,
  playerName,
  fullName,
  benchAccessibleLabel,
  ringClass = "",
  onSell,
  onSwap,
  onInfo,
  onOpenActions,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: PlannerPlayerCardProps) {
  const palette = plannerCardPalette(themeId);
  const aria = formatPlayerTileAccessibleName({
    lang,
    webName: playerName,
    fullName,
    clubShort: player?.club_short_name ?? "",
    isCaptain: pick.isCaptain,
    isViceCaptain: pick.isViceCaptain,
    benchLabel: benchAccessibleLabel,
  });
  const armbandText = captainArmbandLabel(lang, armbandKind);
  const dots = cardNextFdrDots(projectionsForElement, currentGw);
  const dotsTip = pt(lang, "planner.fdr.next3", {
    list: [1, 2, 3]
      .map((offset) => {
        const pills = formatFixturePills(
          lang,
          projectionsForElement?.[currentGw + offset],
        );
        const text = pills
          .map((pill) =>
            pill.kind === "match" ? `${pill.label} ${pill.fdrLevel}` : pill.label,
          )
          .join(" ");
        return text || "—";
      })
      .join(" · "),
  });
  const fill = shirtFill(player?.club_primary_color, player?.club_short_name);
  const showActions = !isExporting;
  const infoLabel = pt(lang, "planner.card.info", {
    player: fullName || playerName,
  });

  return (
    <article
      role="group"
      aria-label={aria}
      data-testid="player-tile"
      data-card="u6"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`ppc-card max-w-full ${ringClass}`}
    >
      {showActions ? (
        <>
          <button
            type="button"
            title={actionAria(lang, "planner.action.sell", playerName)}
            aria-label={actionAria(lang, "planner.action.sell", playerName)}
            className={`ppc-act ppc-act-sell rounded-full ${palette.icon}`}
            onClick={(event) => {
              event.stopPropagation();
              onSell();
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            title={actionAria(lang, "planner.action.swap", playerName)}
            aria-label={actionAria(lang, "planner.action.swap", playerName)}
            className={`ppc-act ppc-act-swap rounded-full ${palette.icon}`}
            onClick={(event) => {
              event.stopPropagation();
              onSwap();
            }}
          >
            <ArrowLeftRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : null}

      <div className={`ppc-shirt ${fill ? "" : palette.name}`}>
        <ClubShirt color={fill} />
        {armbandKind && armbandText ? (
          <span
            data-testid="captain-armband"
            role="img"
            aria-label={captainArmbandAria(lang, armbandKind)}
            className={`ppc-badge ${
              armbandKind === "TC" ? "ppc-badge-tc" : ""
            } ${armbandKind === "VC" ? palette.badgeVC : palette.badgeC}`}
          >
            {armbandText}
          </span>
        ) : null}
        {player?.club_pulse_code ? (
          <img
            src={fplLabBadgeUrl(player.club_pulse_code)}
            alt=""
            crossOrigin="anonymous"
            className="ppc-crest"
          />
        ) : null}
        {showActions ? (
          <>
            <button
              type="button"
              className="ppc-shirt-info ppc-info-hit"
              data-testid="card-shirt-info"
              aria-label={infoLabel}
              onClick={(event) => {
                event.stopPropagation();
                onInfo();
              }}
            />
            <button
              type="button"
              className="ppc-shirt-hit"
              aria-label={pt(lang, "planner.card.actions", {
                player: fullName || playerName,
              })}
              onClick={(event) => {
                event.stopPropagation();
                onOpenActions();
              }}
            />
          </>
        ) : null}
      </div>

      <div className={`ppc-plate ${palette.plate}`}>
        {showActions ? (
          <button
            type="button"
            className={`ppc-name ppc-info-hit ${palette.name}`}
            data-testid="card-player-name"
            data-allow-ellipsis="1"
            title={fullName || playerName}
            aria-label={infoLabel}
            onClick={(event) => {
              event.stopPropagation();
              onInfo();
            }}
          >
            {playerName}
          </button>
        ) : (
          <b
            className={`ppc-name ${palette.name}`}
            data-testid="card-player-name"
            data-allow-ellipsis="1"
            title={fullName || playerName}
          >
            {playerName}
          </b>
        )}
        <PlannerFixturePills
          lang={lang}
          proj={proj}
          isLight={isLight}
          fdrClass={fdrPillClass}
          compact
          blankClass={palette.blankPill}
        />
        <div
          className="ppc-dots"
          data-testid="fdr-dots"
          title={dotsTip}
          aria-label={dotsTip}
        >
          {dots.map((dot) => (
            <span
              key={dot.gw}
              data-testid="fdr-dot"
              data-fdr-level={dot.fdrLevel ?? "blank"}
              className={`ppc-dot ${
                dot.fdrLevel == null
                  ? palette.dotBlank
                  : fdrDotClass(dot.fdrLevel, themeId)
              }`}
            />
          ))}
        </div>
        <CardDataLine
          lang={lang}
          pick={pick}
          player={player}
          proj={proj}
          tileMetric={tileMetric}
          activeChip={activeChip}
          xptsClass={palette.xpts}
          priceClass={palette.price}
        />
      </div>
    </article>
  );
}

function CardDataLine({
  lang,
  pick,
  player,
  proj,
  tileMetric,
  activeChip,
  xptsClass,
  priceClass,
}: {
  lang: StatsLabLang;
  pick: ReconstructedSquadPick;
  player: PlannerPlayerCatalogItem | undefined;
  proj: PlayerGwProjection | undefined;
  tileMetric: PlannerTileMetric;
  activeChip: PlannerChipType | null;
  xptsClass: string;
  priceClass: string;
}) {
  const price = safePounds(pick.sellingPriceTenths);
  const base = cardDisplayedXPts(proj);
  const xptsLabel = pt(lang, "planner.card.xpts");
  const sep = pt(lang, "planner.card.sep");

  let body: ReactNode;
  if (tileMetric === "XPTS") {
    const mult = pick.isCaptain ? (activeChip === "3xc" ? 3 : 2) : 1;
    const shown = base * (Number.isFinite(mult) ? mult : 1);
    const text =
      pick.isCaptain && mult > 1
        ? pt(lang, "planner.card.xptsMult", {
            base: formatCardXPts(base),
            mult,
            shown: formatCardXPts(shown),
          })
        : formatCardXPts(base);
    body = (
      <>
        <span className={`ppc-xp ${xptsClass}`}>{text}</span>
        <span className={`ppc-xpl ${priceClass}`}>{xptsLabel}</span>
      </>
    );
  } else if (tileMetric === "PRICES") {
    const full = `${safePounds(pick.purchasePriceTenths)}/${safePounds(pick.nowCostTenths)}/${price}`;
    const short = `${shortTenths(pick.purchasePriceTenths)}/${shortTenths(pick.nowCostTenths)}/${shortTenths(pick.sellingPriceTenths)}`;
    body = (
      <span className={`ppc-price ${priceClass}`} title={full} aria-label={full}>
        <span className="ppc-prices-full">{full}</span>
        <span className="ppc-prices-short">{short}</span>
      </span>
    );
  } else if (tileMetric === "FORM") {
    const form = Number(player?.form);
    const tsb = Number(player?.selected_by_percent);
    body = (
      <span className={`ppc-price ${priceClass}`}>
        {Number.isFinite(form) ? form.toFixed(1) : "0.0"}
        {sep}
        {Number.isFinite(tsb) ? tsb.toFixed(1) : "0.0"}%
      </span>
    );
  } else if (tileMetric === "DC") {
    const dcPts = Number(player?.dc_bonus_points);
    const dc = Number(player?.defensive_contribution);
    body = (
      <span className={`ppc-price ${priceClass}`}>
        {Number.isFinite(dcPts) ? dcPts : 0}
        {sep}
        {Number.isFinite(dc) ? dc : 0}
        {sep}
        {formatCardXPts(base)}
      </span>
    );
  } else {
    body = (
      <>
        <span className={`ppc-xp ${xptsClass}`}>{formatCardXPts(base)}</span>
        <span className={`ppc-xpl ${priceClass}`}>{xptsLabel}</span>
        <span className={`ppc-sep ${priceClass}`}>{sep}</span>
        <span className={`ppc-price ${priceClass}`}>{price}</span>
      </>
    );
  }

  return (
    <div className="ppc-data" data-testid="card-data-line">
      {body}
    </div>
  );
}
