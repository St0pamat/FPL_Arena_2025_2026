import { getDivisionRoleMention } from "@/lib/admin/discordRoles";

export type SummaryDiscordFixtureInput = {
  home_team_id: string;
  away_team_id: string;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  is_finished: boolean;
  is_published: boolean;
  is_playoff?: boolean | null;
};

export type SummaryDiscordTeamInput = {
  manager_name: string;
  discord_id?: string | null;
};

const SUMMARY_EMBED_COLOR = 5793266;

function isValidDiscordSnowflake(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed);
}

/** `<@snowflake>` lub manager_name (bez @). */
export function formatSummaryDiscordPlayer(
  team: SummaryDiscordTeamInput | undefined,
): string {
  if (!team) return "—";
  if (isValidDiscordSnowflake(team.discord_id)) {
    return `<@${String(team.discord_id).trim()}>`;
  }
  const name = String(team.manager_name ?? "").trim();
  return name || "—";
}

function formatFplPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return String(Number(value));
}

/**
 * Buduje payload JSON embed Discord — podsumowanie kolejki (wyniki FPL + pingi).
 */
export function generateSummaryDiscordJSON(
  divisionName: string,
  tier: number,
  gameweek: number,
  fixtures: SummaryDiscordFixtureInput[],
  teamsById: Map<string, SummaryDiscordTeamInput>,
): { payload: Record<string, unknown>; matchCount: number } {
  const played = fixtures.filter(
    (f) =>
      !f.is_playoff && (Boolean(f.is_finished) || Boolean(f.is_published)),
  );

  const matchLines = played.map((f) => {
    const home = teamsById.get(f.home_team_id);
    const away = teamsById.get(f.away_team_id);
    const homeLabel = formatSummaryDiscordPlayer(home);
    const awayLabel = formatSummaryDiscordPlayer(away);
    const homeFpl = formatFplPoints(f.home_fpl_points);
    const awayFpl = formatFplPoints(f.away_fpl_points);
    return `${homeLabel} **${homeFpl} : ${awayFpl}** ${awayLabel}`;
  });

  const matchesBlock =
    matchLines.length > 0
      ? matchLines.join("\n")
      : "(brak rozegranych meczów w tej kolejce)";

  const roleMention = getDivisionRoleMention(tier);
  const content = roleMention
    ? `🚨 **UWAGA ${roleMention} !** 🚨`
    : "🚨 **UWAGA !** 🚨";

  const payload = {
    content,
    embeds: [
      {
        title: `🏆 Wyniki & Tabela - GW ${gameweek}`,
        description: [
          `🏴󠁧󠁢󠁥󠁮󠁧󠁿 **${divisionName}** (FPL Arena: Na Minusie ™)`,
          "",
          "**Komplet wyników w tej kolejce:**",
          matchesBlock,
        ].join("\n"),
        color: SUMMARY_EMBED_COLOR,
      },
    ],
  };

  return { payload, matchCount: played.length };
}
