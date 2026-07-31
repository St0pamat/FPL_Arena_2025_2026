import { PLAYERS_DATA } from "@arena/data/players";
import { TEAM_BY_NAME } from "@arena/config/playersIndex";

const TEAM_NAMES = PLAYERS_DATA.map((p) => p.team);

/** Dopasowanie nazwy drużyny z danych H2H do fplId (herb). */
export function resolveTeamFplId(name: string | undefined | null): number | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (TEAM_BY_NAME[trimmed]) return TEAM_BY_NAME[trimmed].id;

  const lower = trimmed.toLowerCase();
  const exactCi = TEAM_NAMES.find((t) => t.toLowerCase() === lower);
  if (exactCi && TEAM_BY_NAME[exactCi]) return TEAM_BY_NAME[exactCi].id;

  const partial = TEAM_NAMES.find(
    (t) => t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase())
  );
  if (partial && TEAM_BY_NAME[partial]) return TEAM_BY_NAME[partial].id;

  return null;
}
