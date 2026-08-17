/**
 * Scenariusze + silnik losujący FPL (MODUŁ 4).
 * Mapowanie UI → zakresy punktów.
 */

export type SimulatorScenarioId =
  | "CHAOS"
  | "NEGATIVE"
  | "TIGHT"
  | "DRAW_FESTIVAL";

export type SimulatorScenarioMeta = {
  id: SimulatorScenarioId;
  label: string;
  description: string;
  accent: "green" | "red" | "amber" | "sky";
  emoji: string;
};

export const SIMULATOR_SCENARIOS: SimulatorScenarioMeta[] = [
  {
    id: "CHAOS",
    label: "Standardowy Chaos",
    description: "Losowe 30–100 pkt na menedżera.",
    accent: "green",
    emoji: "🟢",
  },
  {
    id: "NEGATIVE",
    label: "Czerwone Kartki",
    description: "Ujemne i niskie punkty: −10 do 30 pkt.",
    accent: "red",
    emoji: "🔴",
  },
  {
    id: "TIGHT",
    label: "Stykowa Tabela",
    description: "Zagęszczone wyniki 50–55 pkt (sortowanie / tie-break).",
    accent: "amber",
    emoji: "🟡",
  },
  {
    id: "DRAW_FESTIVAL",
    label: "Festiwal Remisów",
    description: "Wymusza idealne remisy FPL w parach H2H.",
    accent: "sky",
    emoji: "🔵",
  },
];

export function scenarioLabel(id: SimulatorScenarioId): string {
  return SIMULATOR_SCENARIOS.find((s) => s.id === id)?.label ?? id;
}

/** Inclusive integer roll. */
export function randInt(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** Para punktów FPL wg scenariusza (home / away). */
export function rollFplPair(scenario: SimulatorScenarioId): {
  home: number;
  away: number;
} {
  switch (scenario) {
    case "CHAOS":
      return { home: randInt(30, 100), away: randInt(30, 100) };
    case "NEGATIVE":
      return { home: randInt(-10, 30), away: randInt(-10, 30) };
    case "TIGHT":
      return { home: randInt(50, 55), away: randInt(50, 55) };
    case "DRAW_FESTIVAL": {
      const score = randInt(40, 80);
      return { home: score, away: score };
    }
    default: {
      const _exhaustive: never = scenario;
      return _exhaustive;
    }
  }
}

/** Pojedynczy wynik FPL (gracze bez meczu H2H w GW19/38). */
export function rollFplSolo(scenario: SimulatorScenarioId): number {
  return rollFplPair(scenario).home;
}
