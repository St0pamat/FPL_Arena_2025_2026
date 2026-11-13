/**
 * Prezentacja pigułek meczów Planera (U3).
 * Nie używa formatOpponentTicker z silnika — zawsze UPPER + (D|W)/(H|A).
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { pt } from "@/lib/stats-lab/plannerI18n";

export type FixturePillKind = "match" | "none" | "unknown";

export type FixturePillModel = {
  kind: FixturePillKind;
  /** Tekst widoczny; dla match zawsze /^[A-Z]{3} \((D|W|H|A)\)$/ gdy kod 3-literowy. */
  label: string;
  isHome: boolean | null;
  fdrLevel: number;
};

/** Klasy wspólne: jedna linia, min. 11px, równa szerokość w rzędzie. */
export const FIXTURE_PILL_CLASS =
  "inline-flex min-w-[4.5rem] items-center justify-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-black leading-none";

export function formatFixturePillLabel(
  lang: StatsLabLang,
  shortName: string | null | undefined,
  isHome: boolean,
): string | null {
  const raw = String(shortName ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!raw) return null;
  const display = raw.slice(0, 3);
  const venue =
    lang === "pl" ? (isHome ? "D" : "W") : isHome ? "H" : "A";
  return `${display} (${venue})`;
}

export function formatFixturePills(
  lang: StatsLabLang,
  proj: PlayerGwProjection | null | undefined,
): FixturePillModel[] {
  if (!proj || proj.isBlank) {
    return [
      {
        kind: "none",
        label: pt(lang, "planner.fixture.none"),
        isHome: null,
        fdrLevel: 3,
      },
    ];
  }

  const fixtures = proj.fixtures ?? [];

  if (fixtures.length === 0) {
    return [
      {
        kind: "unknown",
        label: pt(lang, "planner.fixture.unknown"),
        isHome: null,
        fdrLevel: 3,
      },
    ];
  }

  const pills: FixturePillModel[] = [];
  for (const fx of fixtures) {
    const label = formatFixturePillLabel(
      lang,
      fx.opponentShortName,
      fx.isHome,
    );
    if (!label) {
      pills.push({
        kind: "unknown",
        label: pt(lang, "planner.fixture.unknown"),
        isHome: fx.isHome,
        fdrLevel: fx.fdrLevel ?? 3,
      });
    } else {
      pills.push({
        kind: "match",
        label,
        isHome: fx.isHome,
        fdrLevel: fx.fdrLevel ?? 3,
      });
    }
  }
  return pills;
}

export function matchPillRegex(lang: StatsLabLang): RegExp {
  return lang === "pl"
    ? /^[A-Z]{3} \((D|W)\)$/
    : /^[A-Z]{3} \((H|A)\)$/;
}

export type CaptainArmbandKind = "C" | "VC" | "TC" | null;

export function captainArmbandKind(args: {
  isCaptain: boolean;
  isViceCaptain: boolean;
  activeChip: string | null | undefined;
}): CaptainArmbandKind {
  if (args.isCaptain && args.activeChip === "3xc") return "TC";
  if (args.isCaptain) return "C";
  if (args.isViceCaptain) return "VC";
  return null;
}

export function captainArmbandAria(
  lang: StatsLabLang,
  kind: CaptainArmbandKind,
): string {
  if (kind === "TC") return pt(lang, "planner.role.badgeTC.aria");
  if (kind === "C") return pt(lang, "planner.role.captain");
  if (kind === "VC") return pt(lang, "planner.role.vice");
  return "";
}

/** Wspólny skrót C / VC / TC na boisku i w tabeli horyzontu. */
export function captainArmbandLabel(
  lang: StatsLabLang,
  kind: CaptainArmbandKind,
): string {
  if (kind === "TC") return pt(lang, "planner.role.badgeTC");
  if (kind === "C") return pt(lang, "planner.role.badgeC");
  if (kind === "VC") return pt(lang, "planner.role.badgeVC");
  return "";
}

/** Hit area: 32px desktop / 44px coarse pointer. */
export const PLANNER_ACTION_HIT_CLASS =
  "inline-flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11";
