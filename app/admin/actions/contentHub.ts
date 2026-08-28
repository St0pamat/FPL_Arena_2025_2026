"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/admin/types";
import {
  generateSummaryDiscordJSON,
  type SummaryDiscordFixtureInput,
  type SummaryDiscordTeamInput,
} from "@/lib/admin/discordSummary";
import {
  DEFAULT_DISCORD_SERVER,
  DISCORD_SERVER_LABELS,
  normalizeDiscordServerTargets,
  type DiscordServerTarget,
} from "@/lib/admin/discordWebhooks";

export type ContentHubDivisionOption = {
  id: string;
  name: string;
  tier: number;
  seasonId: string;
  seasonName: string;
  pyramidName: string;
  hasWebhook: boolean;
  hasWebhookByServer: Record<DiscordServerTarget, boolean>;
  label: string;
};

/** Sezon z flagami globalnych webhooków (bez ujawniania URL w kliencie). */
export type ContentHubSeasonOption = {
  id: string;
  name: string;
  status: string;
  hasFaRankingWebhook: boolean;
  hasFaCupWebhook: boolean;
  hasFaRankingWebhookByServer: Record<DiscordServerTarget, boolean>;
  hasFaCupWebhookByServer: Record<DiscordServerTarget, boolean>;
};

export type ContentHubGlobalChannel = "fa_ranking" | "fa_cup";

export type ContentHubSendTarget =
  | { kind: "division"; divisionId: string }
  | { kind: "global"; seasonId: string; channel: ContentHubGlobalChannel };

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function formatXMention(
  xCom: string | null | undefined,
  managerName: string,
): string {
  const raw = String(xCom ?? "").trim();
  if (!raw) return managerName.trim() || "—";

  let handle = raw;
  handle = handle.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "");
  handle = handle.replace(/^@+/, "").split(/[/?#]/)[0]?.trim() ?? "";
  if (!handle) return managerName.trim() || "—";
  return `@${handle}`;
}

/** Aktywne dywizje (sezon niezaarchiwizowany) + flaga webhooka (po tierze). */
export async function getContentHubDivisions(): Promise<ContentHubDivisionOption[]> {
  const supabase = await requireAuth();
  const { listDivisionWebhookLevelsByServer } = await import(
    "@/app/admin/actions/discordWebhooks"
  );
  const webhookLevelsByServer = await listDivisionWebhookLevelsByServer(supabase);
  const naMinusieLevels = webhookLevelsByServer.NA_MINUSIE;

  const { data, error } = await supabase
    .from("divisions")
    .select(
      "id, name, tier, season_id, pyramids(id, name), seasons(id, name, status, is_archived)",
    )
    .order("tier", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    tier: number;
    season_id: string;
    pyramids?: { id: string; name: string } | null;
    seasons?: {
      id: string;
      name: string;
      status?: string;
      is_archived?: boolean | null;
    } | null;
  }>;

  return rows
    .filter((d) => !d.seasons?.is_archived)
    .map((d) => {
      const seasonName = d.seasons?.name ?? "Sezon?";
      const pyramidName = d.pyramids?.name ?? "Piramida?";
      const tier = Number(d.tier);
      const hasWebhookByServer: Record<DiscordServerTarget, boolean> = {
        NA_MINUSIE: webhookLevelsByServer.NA_MINUSIE.has(tier),
        FPL_ARENA: webhookLevelsByServer.FPL_ARENA.has(tier),
      };
      return {
        id: d.id,
        name: d.name,
        tier: d.tier,
        seasonId: d.season_id,
        seasonName,
        pyramidName,
        hasWebhook: naMinusieLevels.has(tier) || hasWebhookByServer.FPL_ARENA,
        hasWebhookByServer,
        label: `${seasonName} · ${pyramidName} · D${d.tier} — ${d.name}`,
      };
    })
    .sort((a, b) => {
      const s = a.seasonName.localeCompare(b.seasonName, "pl");
      if (s !== 0) return s;
      const p = a.pyramidName.localeCompare(b.pyramidName, "pl");
      if (p !== 0) return p;
      return a.tier - b.tier;
    });
}

/** Sezony niezaarchiwizowane + flagi trwałych webhooków FA Ranking / FA Cup. */
export async function getContentHubSeasons(): Promise<ContentHubSeasonOption[]> {
  const supabase = await requireAuth();
  const { hasGlobalWebhook } = await import(
    "@/app/admin/actions/discordWebhooks"
  );
  const [
    hasFaRankingNa,
    hasFaCupNa,
    hasFaRankingArena,
    hasFaCupArena,
  ] = await Promise.all([
    hasGlobalWebhook(supabase, "FA_RANKING", "NA_MINUSIE"),
    hasGlobalWebhook(supabase, "FA_CUP", "NA_MINUSIE"),
    hasGlobalWebhook(supabase, "FA_RANKING", "FPL_ARENA"),
    hasGlobalWebhook(supabase, "FA_CUP", "FPL_ARENA"),
  ]);

  const hasFaRankingWebhookByServer: Record<DiscordServerTarget, boolean> = {
    NA_MINUSIE: hasFaRankingNa,
    FPL_ARENA: hasFaRankingArena,
  };
  const hasFaCupWebhookByServer: Record<DiscordServerTarget, boolean> = {
    NA_MINUSIE: hasFaCupNa,
    FPL_ARENA: hasFaCupArena,
  };

  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, status, is_archived")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((s) => !s.is_archived)
    .map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      hasFaRankingWebhook: hasFaRankingNa || hasFaRankingArena,
      hasFaCupWebhook: hasFaCupNa || hasFaCupArena,
      hasFaRankingWebhookByServer,
      hasFaCupWebhookByServer,
    }));
}

/** Distinct GW z rozegranymi meczami (is_finished = true) — dla listy dropdown. */
export async function getContentHubPlayedGameweeks(
  divisionIds: string[],
): Promise<number[]> {
  const supabase = await requireAuth();
  if (!divisionIds.length) return [];

  const { data, error } = await supabase
    .from("fixtures")
    .select("gameweek")
    .in("division_id", divisionIds)
    .eq("is_finished", true);

  if (error) throw new Error(error.message);

  const set = new Set<number>();
  for (const row of data ?? []) {
    const gw = Number(row.gameweek);
    if (Number.isFinite(gw) && gw >= 1) set.add(gw);
  }
  return [...set].sort((a, b) => a - b);
}

export type GenerateXDraftResult = ActionState & {
  draft?: string;
};

/**
 * Generuje szkic posta na X.com: zwycięzcy H2H z GW (x_com lub FPL Manager).
 */
export async function generateXComDraft(
  divisionId: string,
  gameweek: number,
): Promise<GenerateXDraftResult> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Wybierz dywizję." };
    if (!Number.isFinite(gameweek) || gameweek < 1) {
      return { error: "Wybierz kolejkę (GW)." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, name, tier")
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const { data: fixtures, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "home_team_id, away_team_id, home_h2h_points, away_h2h_points, is_finished, is_published, is_playoff, tiebreaker_winner_id",
      )
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);
    if (fixError) return { error: fixError.message };

    const played = (fixtures ?? []).filter((f) => f.is_finished || f.is_published);
    if (!played.length) {
      return {
        error: `Brak rozegranych meczów w ${division.name} · GW${gameweek}.`,
      };
    }

    const teamIds = [
      ...new Set(
        played.flatMap((f) => [f.home_team_id, f.away_team_id].filter(Boolean)),
      ),
    ] as string[];

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, x_com")
      .in("id", teamIds);
    if (teamsError) return { error: teamsError.message };

    const byId = new Map(
      (teams ?? []).map((t) => [
        t.id as string,
        {
          manager_name: String(t.manager_name ?? ""),
          x_com: (t.x_com as string | null) ?? null,
        },
      ]),
    );

    const winners: string[] = [];
    for (const f of played) {
      const homePts = Number(f.home_h2h_points ?? 0);
      const awayPts = Number(f.away_h2h_points ?? 0);
      let winnerId: string | null = null;

      if (homePts > awayPts) winnerId = f.home_team_id;
      else if (awayPts > homePts) winnerId = f.away_team_id;
      else if (f.is_playoff && f.tiebreaker_winner_id) {
        winnerId = f.tiebreaker_winner_id as string;
      }

      if (!winnerId) continue;
      const team = byId.get(winnerId);
      if (!team) continue;
      winners.push(formatXMention(team.x_com, team.manager_name));
    }

    const winnersBlock =
      winners.length > 0
        ? winners.join(", ")
        : "(brak jednoznacznych zwycięzców H2H)";

    const draft = [
      `🏆 Wyniki & Tabela - GW ${gameweek}`,
      `🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${division.name} (FPL Arena: Na Minusie ™)`,
      ``,
      `Swoje mecze wygrali:`,
      winnersBlock,
      ``,
      `#FPL #FPLpl #FantasyPL`,
    ].join("\n");

    return { error: null, success: "Szkic X.com gotowy.", draft };
  } catch (e) {
    console.error("[generateXComDraft]", e);
    return {
      error: e instanceof Error ? e.message : "Nie udało się wygenerować szkicu.",
    };
  }
}

export type GeneratePreviewDiscordResult = ActionState & {
  json?: string;
};

export type GenerateSummaryDiscordResult = ActionState & {
  json?: string;
};

/**
 * Szkic X.com — zapowiedź nadchodzącej kolejki (bez wyników).
 * Oznacza 2–4 graczy z x_com z najciekawszych par.
 */
export async function generatePreviewXComDraft(
  divisionId: string,
  gameweek: number,
): Promise<GenerateXDraftResult> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Wybierz dywizję." };
    if (!Number.isFinite(gameweek) || gameweek < 1) {
      return { error: "Wybierz kolejkę (GW)." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, name, tier")
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const { data: fixtures, error: fixError } = await supabase
      .from("fixtures")
      .select("home_team_id, away_team_id, is_playoff")
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);
    if (fixError) return { error: fixError.message };

    const regular = (fixtures ?? []).filter((f) => !f.is_playoff);
    if (!regular.length) {
      return {
        error: `Brak meczów w terminarzu ${division.name} · GW${gameweek}.`,
      };
    }

    const teamIds = [
      ...new Set(
        regular.flatMap((f) => [f.home_team_id, f.away_team_id].filter(Boolean)),
      ),
    ] as string[];

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, x_com")
      .in("id", teamIds);
    if (teamsError) return { error: teamsError.message };

    const byId = new Map(
      (teams ?? []).map((t) => [
        t.id as string,
        {
          manager_name: String(t.manager_name ?? ""),
          x_com: (t.x_com as string | null) ?? null,
        },
      ]),
    );

    type Pair = { a: string; b: string };
    const pairs: Pair[] = [];
    for (const f of regular) {
      const home = byId.get(f.home_team_id as string);
      const away = byId.get(f.away_team_id as string);
      if (!home || !away) continue;
      const a = formatXMention(home.x_com, home.manager_name);
      const b = formatXMention(away.x_com, away.manager_name);
      pairs.push({ a, b });
    }

    const pairsBlock =
      pairs.length > 0
        ? pairs.map((p) => `${p.a} vs ${p.b}`).join("\n")
        : "(brak par w terminarzu)";

    // Pełna wersja z ozdobnikami
    let draft = [
      `🔜 Zapowiedź GW${gameweek}!`,
      `🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${division.name} (FPL Arena: Na Minusie ™)`,
      ``,
      pairsBlock,
      ``,
      `Kto zdobędzie 3 punkty? 🔥 #FPL #FPLpl`,
    ].join("\n");

    // Fallback: bez footer gdy za długi
    if (draft.length > 280) {
      draft = [
        `🔜 Zapowiedź GW${gameweek}!`,
        `🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${division.name} (FPL Arena: Na Minusie ™)`,
        ``,
        pairsBlock,
      ].join("\n");
    }

    // Ostateczność: twardy trim
    if (draft.length > 280) {
      draft = draft.slice(0, 277) + "…";
    }

    return { error: null, success: "Szkic zapowiedzi X.com gotowy.", draft };
  } catch (e) {
    console.error("[generatePreviewXComDraft]", e);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Nie udało się wygenerować zapowiedzi X.com.",
    };
  }
}

/**
 * JSON embed Discord — zapowiedź kolejki (pomarańczowy / złoty).
 */
export async function generatePreviewDiscordJSON(
  divisionId: string,
  gameweek: number,
): Promise<GeneratePreviewDiscordResult> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Wybierz dywizję." };
    if (!Number.isFinite(gameweek) || gameweek < 1) {
      return { error: "Wybierz kolejkę (GW)." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, name")
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const { data: fixtures, error: fixError } = await supabase
      .from("fixtures")
      .select("home_team_id, away_team_id, is_playoff")
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);
    if (fixError) return { error: fixError.message };

    const regular = (fixtures ?? []).filter((f) => !f.is_playoff);
    if (!regular.length) {
      return {
        error: `Brak meczów w terminarzu ${division.name} · GW${gameweek}.`,
      };
    }

    const teamIds = [
      ...new Set(
        regular.flatMap((f) => [f.home_team_id, f.away_team_id].filter(Boolean)),
      ),
    ] as string[];

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, chosen_club")
      .in("id", teamIds);
    if (teamsError) return { error: teamsError.message };

    const byId = new Map(
      (teams ?? []).map((t) => [
        t.id as string,
        {
          manager_name: String(t.manager_name ?? "—").trim() || "—",
          club: String(t.chosen_club ?? "").trim(),
        },
      ]),
    );

    const fields = regular.map((f, i) => {
      const home = byId.get(f.home_team_id as string);
      const away = byId.get(f.away_team_id as string);
      const homeLabel = home
        ? `${home.manager_name}${home.club ? ` (${home.club})` : ""}`
        : "—";
      const awayLabel = away
        ? `${away.manager_name}${away.club ? ` (${away.club})` : ""}`
        : "—";
      return {
        name: `Mecz ${i + 1}`,
        value: `**${homeLabel}** vs **${awayLabel}**`,
        inline: false,
      };
    });

    // Discord embed color: złoty / pomarańczowy (#EAB308)
    const GOLD_ORANGE = 0xeab308;

    const payload = {
      content: `🔜 Deadline FPL się zbliża — czas ustawić składy!`,
      embeds: [
        {
          title: `🔜 Zapowiedź Kolejki ${gameweek}! 🏆`,
          description: [
            `**${division.name}** · FPL Arena: Na Minusie ™`,
            ``,
            `Budujemy napięcie przed deadlinem Fantasy Premier League.`,
            `Zmiany kapitanów, ostatnie ruchy transferowe i walka o ligowe punkty H2H — oto pary tej kolejki:`,
          ].join("\n"),
          color: GOLD_ORANGE,
          fields,
          footer: { text: "Content Hub · Zapowiedź kolejki" },
        },
      ],
    };

    return {
      error: null,
      success: "JSON zapowiedzi Discord gotowy.",
      json: JSON.stringify(payload, null, 2),
    };
  } catch (e) {
    console.error("[generatePreviewDiscordJSON]", e);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Nie udało się wygenerować JSON-a zapowiedzi.",
    };
  }
}

/**
 * JSON embed Discord — podsumowanie kolejki (wyniki FPL, ping roli dywizji).
 */
export async function generateSummaryDiscordJSONForDivision(
  divisionId: string,
  gameweek: number,
): Promise<GenerateSummaryDiscordResult> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Wybierz dywizję." };
    if (!Number.isFinite(gameweek) || gameweek < 1) {
      return { error: "Wybierz kolejkę (GW)." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, name, tier")
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const { data: fixturesRaw, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "home_team_id, away_team_id, home_fpl_points, away_fpl_points, is_finished, is_published, is_playoff",
      )
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);
    if (fixError) return { error: fixError.message };

    const fixtures: SummaryDiscordFixtureInput[] = (fixturesRaw ?? []).map(
      (f) => ({
        home_team_id: String(f.home_team_id ?? ""),
        away_team_id: String(f.away_team_id ?? ""),
        home_fpl_points:
          f.home_fpl_points != null ? Number(f.home_fpl_points) : null,
        away_fpl_points:
          f.away_fpl_points != null ? Number(f.away_fpl_points) : null,
        is_finished: Boolean(f.is_finished),
        is_published: f.is_published !== false,
        is_playoff: Boolean(f.is_playoff),
      }),
    );

    const played = fixtures.filter(
      (f) => f.is_finished || f.is_published,
    );
    if (!played.length) {
      return {
        error: `Brak rozegranych meczów w ${division.name} · GW${gameweek}.`,
      };
    }

    const teamIds = [
      ...new Set(
        played.flatMap((f) => [f.home_team_id, f.away_team_id].filter(Boolean)),
      ),
    ];

    const { data: teamsRaw, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, discord_id")
      .in("id", teamIds);
    if (teamsError) return { error: teamsError.message };

    const teamsById = new Map<string, SummaryDiscordTeamInput>(
      (teamsRaw ?? []).map((t) => [
        String(t.id),
        {
          manager_name: String(t.manager_name ?? "").trim() || "—",
          discord_id: (t.discord_id as string | null) ?? null,
        },
      ]),
    );

    const tier = Number(division.tier) || 1;
    const { payload, matchCount } = generateSummaryDiscordJSON(
      String(division.name ?? "—"),
      tier,
      gameweek,
      fixtures,
      teamsById,
    );

    if (matchCount === 0) {
      return {
        error: `Brak rozegranych meczów ligowych w ${division.name} · GW${gameweek}.`,
      };
    }

    return {
      error: null,
      success: "JSON podsumowania Discord gotowy.",
      json: JSON.stringify(payload, null, 2),
    };
  } catch (e) {
    console.error("[generateSummaryDiscordJSONForDivision]", e);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Nie udało się wygenerować JSON-a podsumowania.",
    };
  }
}

export type DiscordWebhookSendDestination = {
  url: string;
  label: string;
  serverTarget: DiscordServerTarget;
};

/**
 * Zwraca URL-e webhooków dla zalogowanego admina (wysyłka idzie z przeglądarki).
 * `serverTargets` — Na Minusie / FPL Arena / oba.
 */
export async function getDiscordWebhookForSend(
  target: ContentHubSendTarget | string,
  serverTargets: DiscordServerTarget[] = [DEFAULT_DISCORD_SERVER],
): Promise<
  | {
      destinations: DiscordWebhookSendDestination[];
      label: string;
    }
  | { error: string }
> {
  try {
    const servers = normalizeDiscordServerTargets(serverTargets);
    if (!servers.length) {
      return { error: "Wybierz co najmniej jeden serwer Discord." };
    }

    const supabase = await requireAuth();
    const resolvedTarget: ContentHubSendTarget =
      typeof target === "string"
        ? { kind: "division", divisionId: target }
        : target;

    const destinations: DiscordWebhookSendDestination[] = [];
    const missing: string[] = [];

    for (const server of servers) {
      const dest = await resolveWebhookTarget(supabase, resolvedTarget, server);
      if (!dest || "error" in dest || !dest.webhook?.trim()) {
        missing.push(
          dest && "error" in dest
            ? dest.error
            : `Brak webhooka · ${DISCORD_SERVER_LABELS[server]}`,
        );
        continue;
      }
      destinations.push({
        url: dest.webhook,
        label: dest.label,
        serverTarget: server,
      });
    }

    if (!destinations.length) {
      return {
        error:
          missing[0] ??
          "Brak skonfigurowanego adresu Webhooka dla tej akcji.",
      };
    }
    if (missing.length) {
      return {
        error: `Brak webhooka dla części serwerów: ${missing.join(" ")}`,
      };
    }

    const channelLabel = destinations[0]?.label ?? "Discord";
    const serverNames = destinations
      .map((d) => DISCORD_SERVER_LABELS[d.serverTarget])
      .join(" + ");
    return {
      destinations,
      label: `${channelLabel} · ${serverNames}`,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Nie udało się pobrać webhooka.",
    };
  }
}

async function resolveWebhookTarget(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  target: ContentHubSendTarget,
  serverTarget: DiscordServerTarget,
): Promise<{ webhook: string; label: string } | { error: string }> {
  const {
    resolveDivisionWebhookById,
    resolveGlobalWebhook,
  } = await import("@/app/admin/actions/discordWebhooks");

  if (target.kind === "division") {
    const dest = await resolveDivisionWebhookById(
      supabase,
      target.divisionId,
      serverTarget,
    );
    if ("error" in dest) return dest;
    return { webhook: dest.url, label: dest.label };
  }

  const globalType =
    target.channel === "fa_ranking" ? "FA_RANKING" : "FA_CUP";
  const dest = await resolveGlobalWebhook(supabase, globalType, serverTarget);
  if ("error" in dest) return dest;

  const { data: season } = await supabase
    .from("seasons")
    .select("name")
    .eq("id", target.seasonId)
    .maybeSingle();
  const seasonName = season?.name ? String(season.name) : null;
  return {
    webhook: dest.url,
    label: seasonName ? `${seasonName} · ${dest.label}` : dest.label,
  };
}

export type ContentHubCapturePayload = {
  divisionId: string;
  divisionName: string;
  tier: number;
  seasonName: string;
  pyramidName: string;
  gameweek: number;
  standings: import("@/lib/public/types").PublicStandingRow[];
  gwDetails: import("@/lib/public/types").GameweekDetailsPayload;
};

/** Dane do off-screen PNG (wyniki GW + tabela) — admin, także drafty. */
export async function getContentHubCaptureData(
  divisionId: string,
  gameweek: number,
): Promise<{ error: string | null; data?: ContentHubCapturePayload }> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Wybierz dywizję." };
    if (!Number.isFinite(gameweek) || gameweek < 1) {
      return { error: "Wybierz kolejkę (GW)." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select(
        "id, name, tier, season_id, pyramid_id, pyramids(name), seasons(name)",
      )
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const { data: teamsRaw, error: teamsError } = await supabase
      .from("teams")
      .select(
        "id, manager_name, discord_nick, discord_id, fpl_id, fpl_team_name, chosen_club",
      )
      .eq("division_id", divisionId)
      .order("manager_name", { ascending: true });
    if (teamsError) return { error: teamsError.message };

    const { data: fixturesRaw, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_published, is_playoff, tiebreaker_winner_id",
      )
      .eq("division_id", divisionId)
      .order("gameweek", { ascending: true });
    if (fixError) return { error: fixError.message };

    const { buildPublicStandings, gameweekMedianThreshold } = await import(
      "@/lib/public/standings"
    );
    type PublicTeam = import("@/lib/public/types").PublicTeam;
    type PublicFixture = import("@/lib/public/types").PublicFixture;

    const teams: PublicTeam[] = (teamsRaw ?? []).map((row) => ({
      id: row.id,
      manager_name: row.manager_name,
      discord_nick: row.discord_nick,
      discord_id: (row.discord_id as string | null) ?? null,
      fpl_id: row.fpl_id,
      fpl_team_name: row.fpl_team_name,
      chosen_club: row.chosen_club,
      previous_season_or: null,
    }));

    const byId = new Map(teams.map((t) => [t.id, t]));
    const fixtureTeamIds = [
      ...new Set(
        (fixturesRaw ?? []).flatMap((f) => [
          f.home_team_id as string,
          f.away_team_id as string,
        ]),
      ),
    ];
    const missing = fixtureTeamIds.filter((id) => !byId.has(id));
    if (missing.length) {
      const { data: hist } = await supabase
        .from("teams")
        .select(
          "id, manager_name, discord_nick, discord_id, fpl_id, fpl_team_name, chosen_club",
        )
        .in("id", missing);
      for (const row of hist ?? []) {
        const t: PublicTeam = {
          id: row.id,
          manager_name: row.manager_name,
          discord_nick: row.discord_nick,
          discord_id: (row.discord_id as string | null) ?? null,
          fpl_id: row.fpl_id,
          fpl_team_name: row.fpl_team_name,
          chosen_club: row.chosen_club,
          previous_season_or: null,
        };
        byId.set(t.id, t);
        teams.push(t);
      }
    }

    const mapFx = (f: (typeof fixturesRaw)[number]): PublicFixture => ({
      id: f.id,
      gameweek: f.gameweek,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      home_fpl_points: f.home_fpl_points,
      away_fpl_points: f.away_fpl_points,
      home_h2h_points: f.home_h2h_points ?? 0,
      away_h2h_points: f.away_h2h_points ?? 0,
      home_median_bonus: f.home_median_bonus ?? 0,
      away_median_bonus: f.away_median_bonus ?? 0,
      is_finished: Boolean(f.is_finished),
      is_published: f.is_published !== false,
      is_playoff: Boolean(f.is_playoff),
      tiebreaker_home_goals: null,
      tiebreaker_away_goals: null,
      tiebreaker_home_goals_conceded: null,
      tiebreaker_away_goals_conceded: null,
      tiebreaker_home_bench: null,
      tiebreaker_away_bench: null,
      tiebreaker_winner_id: (f.tiebreaker_winner_id as string | null) ?? null,
      tiebreaker_reason: null,
      tiebreaker_method: null,
      home_division_name: null,
      away_division_name: null,
      home_team: byId.get(f.home_team_id) ?? null,
      away_team: byId.get(f.away_team_id) ?? null,
    });

    const allFixtures = (fixturesRaw ?? []).map(mapFx);
    const regular = allFixtures.filter((f) => !f.is_playoff);
    // Admin capture: bierz finished (nawet nieopublikowane)
    const forTable = regular.filter((f) => f.is_finished);
    const tier = division.tier ?? 1;

    let maxTier = tier;
    const { data: peerTiers } = await supabase
      .from("divisions")
      .select("tier")
      .eq("season_id", division.season_id)
      .eq("pyramid_id", division.pyramid_id);
    if (peerTiers?.length) {
      maxTier = Math.max(...peerTiers.map((d) => Number(d.tier) || tier));
    }

    const standings = buildPublicStandings(forTable, [...byId.values()], tier, {
      maxTier,
      isLowestDivision: tier >= maxTier,
    });

    const gwFixtures = regular.filter((f) => f.gameweek === gameweek);
    const isFinished =
      gwFixtures.length > 0 && gwFixtures.every((f) => f.is_finished);
    const threshold = isFinished ? gameweekMedianThreshold(gwFixtures) : null;
    const matches = gwFixtures.map((fixture) => {
      const homeWon = fixture.is_finished && fixture.home_h2h_points === 2;
      const awayWon = fixture.is_finished && fixture.away_h2h_points === 2;
      const draw = fixture.is_finished && fixture.home_h2h_points === 1;
      return { fixture, homeWon, awayWon, draw };
    });

    const pyramid = division.pyramids as { name?: string } | { name?: string }[] | null;
    const season = division.seasons as { name?: string } | { name?: string }[] | null;
    const pyramidName = Array.isArray(pyramid)
      ? pyramid[0]?.name ?? "—"
      : pyramid?.name ?? "—";
    const seasonName = Array.isArray(season)
      ? season[0]?.name ?? "—"
      : season?.name ?? "—";

    return {
      error: null,
      data: {
        divisionId,
        divisionName: division.name,
        tier,
        seasonName,
        pyramidName,
        gameweek,
        standings,
        gwDetails: {
          divisionId,
          gameweek,
          isFinished,
          medianThreshold: threshold,
          matches,
          fplRanking: [],
        },
      },
    };
  } catch (e) {
    console.error("[getContentHubCaptureData]", e);
    return {
      error: e instanceof Error ? e.message : "Nie udało się pobrać danych grafik.",
    };
  }
}

export type FaRankingParticipant = {
  discordClub: string;
  fplManager: string;
  fplTeam: string;
};

/**
 * Pełna lista uczestników Na Minusie (Baza CSV) — alfabetycznie po Discord Club.
 * Do grafiki „Oficjalna lista uczestników The FA Ranking”.
 */
export async function getFaRankingParticipantsRoster(): Promise<{
  players: FaRankingParticipant[];
  seasonLabel: string;
  error: string | null;
}> {
  try {
    await requireAuth();
    const { getRecruitmentClubsData } = await import(
      "@/lib/public/getAvailableClubs"
    );
    const data = await getRecruitmentClubsData();
    const players = [...data.players]
      .map((p) => ({
        discordClub: p.discordClub,
        fplManager: p.fplManager,
        fplTeam: p.fplTeam,
      }))
      .sort((a, b) =>
        a.discordClub.localeCompare(b.discordClub, "pl", {
          sensitivity: "base",
        }),
      );
    return {
      players,
      seasonLabel: "2026/27",
      error: null,
    };
  } catch (e) {
    console.error("[getFaRankingParticipantsRoster]", e);
    return {
      players: [],
      seasonLabel: "2026/27",
      error:
        e instanceof Error
          ? e.message
          : "Nie udało się pobrać listy uczestników.",
    };
  }
}

