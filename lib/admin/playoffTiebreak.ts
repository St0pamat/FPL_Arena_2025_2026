/**
 * Rozstrzyganie remisów w barażach (regulamin §4.2) — kaskada progresywna:
 * FPL → Gole XI → Stracone (GK+DEF) → Ławka → Coin toss.
 *
 * Baraż to mecz pucharowy (nie punktacja ligowa H2H 2/1/0).
 * Gospodarz = wyższa liga (utrzymanie), Gość = niższa (awans).
 */

import type { TiebreakerMethod } from "@/lib/admin/constants";

export type PlayoffCupOutcome =
  | "UTRZYMANIE"
  | "SPADEK"
  | "AWANS"
  | "BRAK_AWANSU";

export type PlayoffTiebreakMethod =
  | "FPL_POINTS"
  | "GOALS_XI"
  | "GOALS_CONCEDED"
  | "BENCH_POINTS"
  | "COIN_TOSS";

/** Alias DB / legacy → kanoniczna metoda. */
export function normalizeTiebreakerMethod(
  raw: string | null | undefined,
): PlayoffTiebreakMethod | null {
  if (!raw) return null;
  switch (raw) {
    case "FPL_POINTS":
    case "FPL":
      return "FPL_POINTS";
    case "GOALS_XI":
    case "GOALS":
      return "GOALS_XI";
    case "GOALS_CONCEDED":
    case "CONCEDED":
      return "GOALS_CONCEDED";
    case "BENCH_POINTS":
    case "BENCH":
      return "BENCH_POINTS";
    case "COIN_TOSS":
    case "MANUAL":
      return "COIN_TOSS";
    default:
      return null;
  }
}

/** Wartość zapisywana w kolumnie tiebreaker_method (CHECK w DB). */
export function toDbTiebreakerMethod(
  method: PlayoffTiebreakMethod,
): TiebreakerMethod | "FPL_POINTS" | "GOALS_XI" | "GOALS_CONCEDED" | "BENCH_POINTS" {
  return method;
}

export type PlayoffTiebreakInput = {
  homeTeamId: string;
  awayTeamId: string;
  homeFpl: number;
  awayFpl: number;
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsConceded: number | null;
  awayGoalsConceded: number | null;
  homeBench: number | null;
  awayBench: number | null;
  /** Wymagane gdy TB1–3 nie rozstrzygają (rzut monetą). */
  manualWinnerId?: string | null;
};

export type PlayoffSanitizedFields = {
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsConceded: number | null;
  awayGoalsConceded: number | null;
  homeBench: number | null;
  awayBench: number | null;
  manualWinnerId: string | null;
};

export type PlayoffTiebreakResult =
  | {
      status: "decided";
      winnerId: string;
      method: PlayoffTiebreakMethod;
      /** Wewnętrzny marker zwycięzcy (nie wyświetlać jako „H2H”). */
      home_h2h_points: 0 | 2;
      away_h2h_points: 0 | 2;
      needsManual: false;
      homeOutcome: PlayoffCupOutcome;
      awayOutcome: PlayoffCupOutcome;
      reason: string;
      fields: PlayoffSanitizedFields;
    }
  | {
      status: "needs_manual";
      winnerId: null;
      method: null;
      home_h2h_points: 0;
      away_h2h_points: 0;
      needsManual: true;
      reason: string;
      fields: PlayoffSanitizedFields;
      /** Który poziom UI odblokować dalej. */
      nextStep: "GOALS_XI" | "GOALS_CONCEDED" | "BENCH_POINTS" | "COIN_TOSS";
    };

export type CascadeVisibility = {
  showGoals: boolean;
  showConceded: boolean;
  showBench: boolean;
  showCoin: boolean;
};

export function bothDefined(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  return a != null && b != null && Number.isFinite(a) && Number.isFinite(b);
}

/** Progresywne odblokowywanie pól TB w formularzu admina. */
export function cascadeVisibility(input: {
  homeFpl: number | null | undefined;
  awayFpl: number | null | undefined;
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsConceded: number | null;
  awayGoalsConceded: number | null;
  homeBench: number | null;
  awayBench: number | null;
}): CascadeVisibility {
  const fplDraw =
    input.homeFpl != null &&
    input.awayFpl != null &&
    input.homeFpl === input.awayFpl;
  if (!fplDraw) {
    return {
      showGoals: false,
      showConceded: false,
      showBench: false,
      showCoin: false,
    };
  }

  const goalsDraw =
    bothDefined(input.homeGoals, input.awayGoals) &&
    input.homeGoals === input.awayGoals;
  const concDraw =
    bothDefined(input.homeGoalsConceded, input.awayGoalsConceded) &&
    input.homeGoalsConceded === input.awayGoalsConceded;
  const benchDraw =
    bothDefined(input.homeBench, input.awayBench) &&
    input.homeBench === input.awayBench;

  return {
    showGoals: true,
    showConceded: goalsDraw,
    showBench: goalsDraw && concDraw,
    showCoin: goalsDraw && concDraw && benchDraw,
  };
}

export function cupOutcomesForWinner(
  winnerId: string,
  homeTeamId: string,
): { homeOutcome: PlayoffCupOutcome; awayOutcome: PlayoffCupOutcome } {
  const homeWins = winnerId === homeTeamId;
  return homeWins
    ? { homeOutcome: "UTRZYMANIE", awayOutcome: "BRAK_AWANSU" }
    : { homeOutcome: "SPADEK", awayOutcome: "AWANS" };
}

export function cupOutcomeLabel(outcome: PlayoffCupOutcome): string {
  switch (outcome) {
    case "UTRZYMANIE":
      return "🟩 UTRZYMANIE";
    case "SPADEK":
      return "🟥 SPADEK";
    case "AWANS":
      return "🟩 AWANS";
    case "BRAK_AWANSU":
      return "🟥 BRAK AWANSU";
  }
}

export function cupOutcomeTone(
  outcome: PlayoffCupOutcome,
): "win" | "loss" {
  return outcome === "UTRZYMANIE" || outcome === "AWANS" ? "win" : "loss";
}

function decided(
  winnerId: string,
  homeTeamId: string,
  method: PlayoffTiebreakMethod,
  reason: string,
  fields: PlayoffSanitizedFields,
): Extract<PlayoffTiebreakResult, { status: "decided" }> {
  const homeWins = winnerId === homeTeamId;
  const outcomes = cupOutcomesForWinner(winnerId, homeTeamId);
  return {
    status: "decided",
    winnerId,
    method,
    home_h2h_points: homeWins ? 2 : 0,
    away_h2h_points: homeWins ? 0 : 2,
    needsManual: false,
    homeOutcome: outcomes.homeOutcome,
    awayOutcome: outcomes.awayOutcome,
    reason,
    fields,
  };
}

/**
 * Ewaluacja kaskadowa + czyszczenie niższych TB po rozstrzygnięciu wyższego.
 */
export function resolvePlayoffWinner(
  input: PlayoffTiebreakInput,
): PlayoffTiebreakResult {
  const {
    homeTeamId,
    awayTeamId,
    homeFpl,
    awayFpl,
    homeGoals,
    awayGoals,
    homeGoalsConceded,
    awayGoalsConceded,
    homeBench,
    awayBench,
    manualWinnerId,
  } = input;

  // 0) FPL różne → koniec
  if (homeFpl !== awayFpl) {
    const winnerId = homeFpl > awayFpl ? homeTeamId : awayTeamId;
    return decided(
      winnerId,
      homeTeamId,
      "FPL_POINTS",
      `Wyższa punktacja FPL (${homeFpl}:${awayFpl})`,
      {
        homeGoals: null,
        awayGoals: null,
        homeGoalsConceded: null,
        awayGoalsConceded: null,
        homeBench: null,
        awayBench: null,
        manualWinnerId: null,
      },
    );
  }

  // Remis FPL → TB1
  if (bothDefined(homeGoals, awayGoals) && homeGoals !== awayGoals) {
    const gH = homeGoals as number;
    const gA = awayGoals as number;
    const homeWins = gH > gA;
    return decided(
      homeWins ? homeTeamId : awayTeamId,
      homeTeamId,
      "GOALS_XI",
      `Gole XI (${gH}:${gA})`,
      {
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded: null,
        awayGoalsConceded: null,
        homeBench: null,
        awayBench: null,
        manualWinnerId: null,
      },
    );
  }

  if (!bothDefined(homeGoals, awayGoals)) {
    return {
      status: "needs_manual",
      winnerId: null,
      method: null,
      home_h2h_points: 0,
      away_h2h_points: 0,
      needsManual: true,
      reason: "Remis FPL — uzupełnij Gole XI (TB1).",
      nextStep: "GOALS_XI",
      fields: {
        homeGoals,
        awayGoals,
        homeGoalsConceded: null,
        awayGoalsConceded: null,
        homeBench: null,
        awayBench: null,
        manualWinnerId: null,
      },
    };
  }

  const gH = homeGoals as number;
  const gA = awayGoals as number;

  // TB1 remis → TB2
  if (
    bothDefined(homeGoalsConceded, awayGoalsConceded) &&
    homeGoalsConceded !== awayGoalsConceded
  ) {
    const cH = homeGoalsConceded as number;
    const cA = awayGoalsConceded as number;
    const homeWins = cH < cA;
    return decided(
      homeWins ? homeTeamId : awayTeamId,
      homeTeamId,
      "GOALS_CONCEDED",
      `Mniej straconych goli GK+DEF (${cH}:${cA})`,
      {
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded: cH,
        awayGoalsConceded: cA,
        homeBench: null,
        awayBench: null,
        manualWinnerId: null,
      },
    );
  }

  if (!bothDefined(homeGoalsConceded, awayGoalsConceded)) {
    return {
      status: "needs_manual",
      winnerId: null,
      method: null,
      home_h2h_points: 0,
      away_h2h_points: 0,
      needsManual: true,
      reason: "Remis w Golach XI — uzupełnij stracone gole GK+DEF (TB2).",
      nextStep: "GOALS_CONCEDED",
      fields: {
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded,
        awayGoalsConceded,
        homeBench: null,
        awayBench: null,
        manualWinnerId: null,
      },
    };
  }

  const cH = homeGoalsConceded as number;
  const cA = awayGoalsConceded as number;

  // TB2 remis → TB3
  if (bothDefined(homeBench, awayBench) && homeBench !== awayBench) {
    const bH = homeBench as number;
    const bA = awayBench as number;
    const homeWins = bH > bA;
    return decided(
      homeWins ? homeTeamId : awayTeamId,
      homeTeamId,
      "BENCH_POINTS",
      `Punkty na ławce (${bH}:${bA})`,
      {
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded: cH,
        awayGoalsConceded: cA,
        homeBench: bH,
        awayBench: bA,
        manualWinnerId: null,
      },
    );
  }

  if (!bothDefined(homeBench, awayBench)) {
    return {
      status: "needs_manual",
      winnerId: null,
      method: null,
      home_h2h_points: 0,
      away_h2h_points: 0,
      needsManual: true,
      reason: "Remis w straconych — uzupełnij punkty z ławki (TB3).",
      nextStep: "BENCH_POINTS",
      fields: {
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded: cH,
        awayGoalsConceded: cA,
        homeBench,
        awayBench,
        manualWinnerId: null,
      },
    };
  }

  const bH = homeBench as number;
  const bA = awayBench as number;

  // TB3 remis → Coin toss
  if (
    manualWinnerId &&
    (manualWinnerId === homeTeamId || manualWinnerId === awayTeamId)
  ) {
    return decided(
      manualWinnerId,
      homeTeamId,
      "COIN_TOSS",
      "Wirtualny rzut monetą",
      {
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded: cH,
        awayGoalsConceded: cA,
        homeBench: bH,
        awayBench: bA,
        manualWinnerId,
      },
    );
  }

  return {
    status: "needs_manual",
    winnerId: null,
    method: null,
    home_h2h_points: 0,
    away_h2h_points: 0,
    needsManual: true,
    reason:
      "Pełny remis TB1–TB3 — wskaż zwycięzcę rzutu monetą (gospodarz / gość).",
    nextStep: "COIN_TOSS",
    fields: {
      homeGoals: gH,
      awayGoals: gA,
      homeGoalsConceded: cH,
      awayGoalsConceded: cA,
      homeBench: bH,
      awayBench: bA,
      manualWinnerId: null,
    },
  };
}

export type PlayoffDecisionStep = {
  key: string;
  label: string;
  isDeciding: boolean;
};

/**
 * Ścieżka remisów + rozstrzygnięcie dla Strefy Gracza.
 * Pokazuje każdy remisowy TB oraz ten, który wyłonił zwycięzcę.
 */
export function buildPlayoffDecisionPath(opts: {
  homeFpl: number | null | undefined;
  awayFpl: number | null | undefined;
  homeGoals: number | null | undefined;
  awayGoals: number | null | undefined;
  homeGoalsConceded: number | null | undefined;
  awayGoalsConceded: number | null | undefined;
  homeBench: number | null | undefined;
  awayBench: number | null | undefined;
  method: string | null | undefined;
  winnerName?: string | null;
}): PlayoffDecisionStep[] {
  const method = normalizeTiebreakerMethod(opts.method);
  const homeFpl = opts.homeFpl;
  const awayFpl = opts.awayFpl;
  if (homeFpl == null || awayFpl == null) return [];

  if (homeFpl !== awayFpl) {
    return [
      {
        key: "fpl",
        label: `⚽ Rozstrzygnięcie: FPL (${homeFpl}:${awayFpl})${
          opts.winnerName ? ` ➔ ${opts.winnerName}` : ""
        }`,
        isDeciding: true,
      },
    ];
  }

  const steps: PlayoffDecisionStep[] = [
    {
      key: "fpl_draw",
      label: `🤝 Remis FPL (${homeFpl}:${awayFpl})`,
      isDeciding: false,
    },
  ];

  // Remis FPL bez metody TB (mecz jeszcze nierozstrzygnięty)
  if (!method || method === "FPL_POINTS") {
    return steps;
  }

  const gH = opts.homeGoals;
  const gA = opts.awayGoals;
  const cH = opts.homeGoalsConceded;
  const cA = opts.awayGoalsConceded;
  const bH = opts.homeBench;
  const bA = opts.awayBench;

  const appendWinner = (base: string) =>
    opts.winnerName ? `${base} ➔ Zwycięzca: ${opts.winnerName}` : base;

  if (method === "GOALS_XI") {
    steps.push({
      key: "goals",
      label: appendWinner(
        `➔ ⚽ Rozstrzygnięcie: Gole XI (${gH ?? "?"}:${gA ?? "?"})`,
      ),
      isDeciding: true,
    });
    return steps;
  }

  // TB1 był remisowy (skoro poszliśmy dalej)
  if (bothDefined(gH, gA)) {
    steps.push({
      key: "goals_draw",
      label: `➔ ⚽ Gole XI (${gH}:${gA}) — remis`,
      isDeciding: false,
    });
  }

  if (method === "GOALS_CONCEDED") {
    steps.push({
      key: "conceded",
      label: appendWinner(
        `➔ 🛡️ Rozstrzygnięcie: Mniej straconych goli (${cH ?? "?"}:${cA ?? "?"})`,
      ),
      isDeciding: true,
    });
    return steps;
  }

  if (bothDefined(cH, cA)) {
    steps.push({
      key: "conceded_draw",
      label: `➔ 🛡️ Stracone gole GK+DEF (${cH}:${cA}) — remis`,
      isDeciding: false,
    });
  }

  if (method === "BENCH_POINTS") {
    steps.push({
      key: "bench",
      label: appendWinner(
        `➔ 🪑 Rozstrzygnięcie: Punkty na ławce (${bH ?? "?"}:${bA ?? "?"})`,
      ),
      isDeciding: true,
    });
    return steps;
  }

  if (bothDefined(bH, bA)) {
    steps.push({
      key: "bench_draw",
      label: `➔ 🪑 Ławka (${bH}:${bA}) — remis`,
      isDeciding: false,
    });
  }

  if (method === "COIN_TOSS") {
    steps.push({
      key: "coin",
      label: appendWinner("➔ 🪙 Rozstrzygnięcie: Wirtualny Rzut Monetą"),
      isDeciding: true,
    });
  }

  return steps;
}
