/** Identyfikatory zakładek Strefy Gracza — współdzielone przez Server i Client Components. */

export type HubTab =
  | "tabela"
  | "wyniki"
  | "terminarz"
  | "statystyki"
  | "uczestnicy"
  | "podsumowanie"
  | "fa-ranking";

export const HUB_TABS: readonly HubTab[] = [
  "tabela",
  "wyniki",
  "terminarz",
  "statystyki",
  "uczestnicy",
  "podsumowanie",
  "fa-ranking",
] as const;

const LEGACY_TAB_ALIASES: Record<string, HubTab> = {
  kolejki: "wyniki",
  profile: "uczestnicy",
  struktura: "tabela",
  rekordy: "statystyki",
  "fa_ranking": "fa-ranking",
  faranking: "fa-ranking",
};

export function parseHubTab(value: string | undefined | null): HubTab {
  if (!value) return "tabela";
  if (HUB_TABS.includes(value as HubTab)) return value as HubTab;
  if (value in LEGACY_TAB_ALIASES) return LEGACY_TAB_ALIASES[value];
  return "tabela";
}
