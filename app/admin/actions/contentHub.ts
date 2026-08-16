"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/admin/types";

export type ContentHubDivisionOption = {
  id: string;
  name: string;
  tier: number;
  seasonId: string;
  seasonName: string;
  pyramidName: string;
  hasWebhook: boolean;
  label: string;
};

/** Sezon z flagami globalnych webhooków (bez ujawniania URL w kliencie). */
export type ContentHubSeasonOption = {
  id: string;
  name: string;
  status: string;
  hasFaRankingWebhook: boolean;
  hasFaCupWebhook: boolean;
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

/** Aktywne dywizje (sezon niezaarchiwizowany) + flaga webhooka. */
export async function getContentHubDivisions(): Promise<ContentHubDivisionOption[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("divisions")
    .select(
      "id, name, tier, season_id, discord_webhook_url, pyramids(id, name), seasons(id, name, status, is_archived)",
    )
    .order("tier", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    tier: number;
    season_id: string;
    discord_webhook_url?: string | null;
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
      return {
        id: d.id,
        name: d.name,
        tier: d.tier,
        seasonId: d.season_id,
        seasonName,
        pyramidName,
        hasWebhook: Boolean((d.discord_webhook_url ?? "").trim()),
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

/** Sezony niezaarchiwizowane + flagi webhooków FA Ranking / FA Cup. */
export async function getContentHubSeasons(): Promise<ContentHubSeasonOption[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, status, is_archived, fa_ranking_webhook_url, fa_cup_webhook_url")
    .order("created_at", { ascending: false });

  if (error) {
    // Migracja jeszcze nie odpalona — zwróć sezony bez flag
    if (/fa_ranking_webhook_url|fa_cup_webhook_url/i.test(error.message)) {
      const { data: fallback, error: err2 } = await supabase
        .from("seasons")
        .select("id, name, status, is_archived")
        .order("created_at", { ascending: false });
      if (err2) throw new Error(err2.message);
      return (fallback ?? [])
        .filter((s) => !s.is_archived)
        .map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          hasFaRankingWebhook: false,
          hasFaCupWebhook: false,
        }));
    }
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((s) => !s.is_archived)
    .map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      hasFaRankingWebhook: Boolean((s.fa_ranking_webhook_url ?? "").trim()),
      hasFaCupWebhook: Boolean((s.fa_cup_webhook_url ?? "").trim()),
    }));
}

/** Distinct GW z rozegranymi / opublikowanymi meczami (dla listy dropdown). */
export async function getContentHubPlayedGameweeks(
  divisionIds: string[],
): Promise<number[]> {
  const supabase = await requireAuth();
  if (!divisionIds.length) return [];

  const { data, error } = await supabase
    .from("fixtures")
    .select("gameweek, is_finished, is_published")
    .in("division_id", divisionIds);

  if (error) throw new Error(error.message);

  const set = new Set<number>();
  for (const row of data ?? []) {
    if (row.is_finished || row.is_published) {
      const gw = Number(row.gameweek);
      if (Number.isFinite(gw) && gw >= 1) set.add(gw);
    }
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

    type Pair = { a: string; b: string; score: number };
    const pairs: Pair[] = [];
    for (const f of regular) {
      const home = byId.get(f.home_team_id as string);
      const away = byId.get(f.away_team_id as string);
      if (!home || !away) continue;
      const a = formatXMention(home.x_com, home.manager_name);
      const b = formatXMention(away.x_com, away.manager_name);
      const score =
        (home.x_com?.trim() ? 2 : 0) + (away.x_com?.trim() ? 2 : 0);
      pairs.push({ a, b, score });
    }

    pairs.sort((x, y) => y.score - x.score);
    const highlight = pairs.slice(0, 2);
    const highlightBlock =
      highlight.length > 0
        ? highlight.map((p) => `${p.a} vs ${p.b}`).join("\n")
        : "(brak par do oznaczenia)";

    let draft = [
      `🔜 Zapowiedź GW${gameweek}!`,
      `🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${division.name} (FPL Arena: Na Minusie ™)`,
      ``,
      `Przed nami kolejne emocje! W tej kolejce zmierzą się m.in.:`,
      highlightBlock,
      ``,
      `Kto zdobędzie cenne 3 punkty? 🔥`,
      `#FPL #FPLpl`,
    ].join("\n");

    if (draft.length > 280) {
      draft = [
        `🔜 Zapowiedź GW${gameweek}!`,
        `🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${division.name} (FPL Arena: Na Minusie ™)`,
        ``,
        highlightBlock,
        ``,
        `Kto zdobędzie 3 pkt? 🔥 #FPL #FPLpl`,
      ].join("\n");
    }

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

export type DiscordWebhookJsonResult = ActionState;

function normalizeWebhookPayload(
  rawJson: string,
): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  if (!rawJson.trim()) return { ok: false, error: "Wklej kod JSON dla Discorda." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Niepoprawny JSON — popraw składnię przed wysyłką." };
  }

  if (Array.isArray(parsed)) {
    return { ok: true, body: { embeds: parsed } };
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.embeds) || typeof obj.content === "string") {
      return { ok: true, body: obj };
    }
    if ("title" in obj || "description" in obj || "fields" in obj) {
      return { ok: true, body: { embeds: [obj] } };
    }
    return {
      ok: false,
      error:
        "JSON musi zawierać `embeds` / `content`, tablicę embedów albo pojedynczy obiekt embed.",
    };
  }
  return { ok: false, error: "JSON musi być obiektem lub tablicą embedów." };
}

async function resolveWebhookTarget(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  target: ContentHubSendTarget,
): Promise<{ webhook: string; label: string } | { error: string }> {
  if (target.kind === "division") {
    const { data: division, error } = await supabase
      .from("divisions")
      .select("id, name, discord_webhook_url")
      .eq("id", target.divisionId)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!division) return { error: "Nie znaleziono dywizji." };
    const webhook = (division.discord_webhook_url ?? "").trim();
    if (!webhook) {
      return { error: "Brak webhooka dla tej dywizji — ustaw w Strukturze Ligi." };
    }
    return { webhook, label: division.name };
  }

  const col =
    target.channel === "fa_ranking"
      ? "fa_ranking_webhook_url"
      : "fa_cup_webhook_url";
  const channelLabel =
    target.channel === "fa_ranking" ? "The FA Ranking" : "FA Cup";

  const { data: season, error } = await supabase
    .from("seasons")
    .select(`id, name, ${col}`)
    .eq("id", target.seasonId)
    .maybeSingle();

  if (error) {
    if (/fa_ranking_webhook_url|fa_cup_webhook_url/i.test(error.message)) {
      return {
        error:
          "Brak kolumn globalnych webhooków. Uruchom migrację: supabase/migrations/add_season_global_webhooks.sql",
      };
    }
    return { error: error.message };
  }
  if (!season) return { error: "Nie znaleziono sezonu." };

  const webhook = String(
    (season as Record<string, unknown>)[col] ?? "",
  ).trim();
  if (!webhook) {
    return {
      error: `Brak webhooka „${channelLabel}” — ustaw w Strukturze Ligi → Kanały globalne.`,
    };
  }
  return { webhook, label: `${season.name} · ${channelLabel}` };
}

/**
 * Wysyła JSON payload (content + embeds) na webhook dywizji lub kanału globalnego.
 */
export async function sendDiscordWebhookJson(
  target: ContentHubSendTarget | string,
  rawJson: string,
): Promise<DiscordWebhookJsonResult> {
  try {
    const supabase = await requireAuth();
    // Kompatybilność: stary kontrakt (divisionId: string)
    const resolvedTarget: ContentHubSendTarget =
      typeof target === "string"
        ? { kind: "division", divisionId: target }
        : target;

    const normalized = normalizeWebhookPayload(rawJson);
    if (!normalized.ok) return { error: normalized.error };

    const dest = await resolveWebhookTarget(supabase, resolvedTarget);
    if ("error" in dest) return { error: dest.error };

    const res = await fetch(dest.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized.body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sendDiscordWebhookJson]", res.status, text);
      return {
        error: `Discord odrzucił wysyłkę (${res.status}). Sprawdź JSON / webhook.`,
      };
    }

    return {
      error: null,
      success: `Wysłano embed na Discord · ${dest.label}`,
    };
  } catch (e) {
    console.error("[sendDiscordWebhookJson]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd wysyłki Discord.",
    };
  }
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
      .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
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
        .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
        .in("id", missing);
      for (const row of hist ?? []) {
        const t: PublicTeam = {
          id: row.id,
          manager_name: row.manager_name,
          discord_nick: row.discord_nick,
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
    const standings = buildPublicStandings(forTable, [...byId.values()], tier);

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

export type DiscordFileAttachment = {
  fileName: string;
  /** data URL lub czysty base64 */
  base64: string;
};

/**
 * Multipart: payload_json + files[0..] (Discord webhook).
 * Dywizje H2H oraz The FA Ranking (karuzela PNG). FA Cup = tylko JSON.
 */
export async function sendDiscordWebhookWithFiles(
  target: ContentHubSendTarget | string,
  rawJson: string,
  files: DiscordFileAttachment[],
): Promise<DiscordWebhookJsonResult> {
  try {
    const supabase = await requireAuth();
    const resolvedTarget: ContentHubSendTarget =
      typeof target === "string"
        ? { kind: "division", divisionId: target }
        : target;

    if (
      resolvedTarget.kind === "global" &&
      resolvedTarget.channel !== "fa_ranking"
    ) {
      return {
        error: "Kanał FA Cup nie przyjmuje załączników PNG (tylko JSON embed).",
      };
    }

    const normalized = normalizeWebhookPayload(rawJson);
    if (!normalized.ok) return { error: normalized.error };
    if (!files.length) {
      return sendDiscordWebhookJson(resolvedTarget, rawJson);
    }

    const dest = await resolveWebhookTarget(supabase, resolvedTarget);
    if ("error" in dest) return { error: dest.error };

    const form = new FormData();
    form.append("payload_json", JSON.stringify(normalized.body));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let payload = file.base64.trim();
      let mime = "image/png";
      const comma = payload.indexOf(",");
      if (payload.startsWith("data:") && comma !== -1) {
        const header = payload.slice(0, comma);
        const match = /^data:([^;]+)/i.exec(header);
        if (match?.[1]) mime = match[1].trim() || mime;
        payload = payload.slice(comma + 1);
      }
      const buffer = Buffer.from(payload, "base64");
      if (!buffer.length) {
        return { error: `Pusty plik: ${file.fileName}` };
      }

      const rawName = (file.fileName || `attachment-${i + 1}`).trim();
      const hasExt = /\.[a-z0-9]{2,5}$/i.test(rawName);
      const extFromMime =
        mime === "image/jpeg" || mime === "image/jpg"
          ? ".jpg"
          : mime === "image/webp"
            ? ".webp"
            : mime === "image/gif"
              ? ".gif"
              : ".png";
      const safeName = hasExt ? rawName : `${rawName}${extFromMime}`;
      const blob = new Blob([new Uint8Array(buffer)], { type: mime });
      form.append(`files[${i}]`, blob, safeName);
    }

    const res = await fetch(dest.webhook, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sendDiscordWebhookWithFiles]", res.status, text);
      return {
        error: `Discord odrzucił wysyłkę (${res.status}). Sprawdź JSON / webhook / limity.`,
      };
    }

    return {
      error: null,
      success: `Wysłano embed + ${files.length} PNG · ${dest.label}`,
    };
  } catch (e) {
    console.error("[sendDiscordWebhookWithFiles]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd wysyłki Discord z plikami.",
    };
  }
}
