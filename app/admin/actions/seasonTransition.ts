"use server";

/**
 * End of Season — Etap 3: Draft Board + finalizacja przejścia.
 */

import { revalidatePath } from "next/cache";
import { generateBergerFixtures, shuffleInPlace } from "@/lib/admin/berger";
import { runCalculateEndSeasonStatuses } from "@/lib/admin/endSeasonCompute";
import {
  DRAFT_TARGET_SIZE,
  nextSeasonNameFromCount,
  suggestNextSeasonName,
  type DraftBoardState,
  type DraftColumn,
  type DraftPlayer,
  type SerializableDraftPayload,
} from "@/lib/admin/seasonDraft";
import type { ActionState } from "@/lib/admin/types";
import { resolveSeasonPhase } from "@/lib/public/season";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function revalidateAll() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/season-transition");
  revalidatePath("/admin/season-settlement");
  revalidatePath("/admin/workspace");
  revalidatePath("/na-minusie/hub");
  revalidatePath("/na-minusie/dywizje");
}

export async function markSeasonCompleted(
  seasonId: string,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Brak sezonu." };
    const { error } = await supabase
      .from("seasons")
      .update({ is_completed: true })
      .eq("id", seasonId);
    if (error) return { error: error.message };
    revalidateAll();
    return {
      error: null,
      success: "Sezon oznaczony jako zakończony — Podsumowanie odblokowane w Strefie Gracza.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd." };
  }
}

export type LoadDraftBoardResult = {
  error: string | null;
  board?: DraftBoardState;
  pyramids?: Array<{ id: string; name: string }>;
  season?: {
    id: string;
    name: string;
    is_completed: boolean;
    is_archived: boolean;
  };
};

/** Buduje tablicę draftu dla sezonu + piramidy. */
export async function loadSeasonDraftBoard(
  seasonId: string,
  pyramidId?: string,
): Promise<LoadDraftBoardResult> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Brak sezonu." };

    const { data: season, error: sErr } = await supabase
      .from("seasons")
      .select("id, name, is_completed, is_archived, status")
      .eq("id", seasonId)
      .maybeSingle();
    if (sErr) return { error: sErr.message };
    if (!season) return { error: "Nie znaleziono sezonu." };
    if (season.is_archived) {
      return {
        error: "Sezon jest już zarchiwizowany — draft niedostępny.",
        season: {
          id: season.id,
          name: season.name,
          is_completed: Boolean(season.is_completed),
          is_archived: true,
        },
      };
    }

    const { data: divisions, error: dErr } = await supabase
      .from("divisions")
      .select("id, name, tier, pyramid_id")
      .eq("season_id", seasonId)
      .order("tier", { ascending: true });
    if (dErr) return { error: dErr.message };

    const divs = divisions ?? [];
    const pyramidIds = [...new Set(divs.map((d) => d.pyramid_id))];
    const { data: pyData } = await supabase
      .from("pyramids")
      .select("id, name")
      .in("id", pyramidIds.length ? pyramidIds : ["00000000-0000-0000-0000-000000000000"]);
    const pyramids = (pyData ?? []).map((p) => ({ id: p.id, name: p.name }));

    const activePyramidId = pyramidId && pyramidIds.includes(pyramidId)
      ? pyramidId
      : pyramidIds[0];
    if (!activePyramidId) {
      return {
        error: "Brak dywizji w sezonie.",
        season: {
          id: season.id,
          name: season.name,
          is_completed: Boolean(season.is_completed),
          is_archived: false,
        },
        pyramids,
      };
    }

    const calc = await runCalculateEndSeasonStatuses(supabase, seasonId);
    if (calc.error || !calc.byTeamId) {
      return {
        error: calc.error ?? "Nie udało się wyliczyć statusów.",
        season: {
          id: season.id,
          name: season.name,
          is_completed: Boolean(season.is_completed),
          is_archived: false,
        },
        pyramids,
      };
    }

    const teamIds = Object.keys(calc.byTeamId);
    const { data: teamsRaw, error: tErr } = await supabase
      .from("teams")
      .select(
        "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id",
      )
      .in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
    if (tErr) return { error: tErr.message };

    const teamById = new Map((teamsRaw ?? []).map((t) => [t.id, t]));
    const pyramidDivs = divs
      .filter((d) => d.pyramid_id === activePyramidId)
      .sort((a, b) => a.tier - b.tier);

    const actualMaxTier =
      calc.activeMaxTierByPyramid?.[activePyramidId] ??
      (() => {
        // Fallback: policz aktywne 10/10 z assignmentów (bez WAITING_ROOM)
        const tiers = new Set<number>();
        for (const a of Object.values(calc.byTeamId!)) {
          if (a.status === "WAITING_ROOM") continue;
          const div = divs.find((d) => d.id === a.division_id);
          if (div?.pyramid_id === activePyramidId) tiers.add(a.current_tier);
        }
        return tiers.size ? Math.max(...tiers) : 1;
      })();

    const activePyramidDivs = pyramidDivs.filter((d) => d.tier <= actualMaxTier);
    // Kolumny tylko dla tierów, które mają aktywną dywizję w sezonie
    const activeTiers = [
      ...new Set(
        activePyramidDivs
          .filter((d) => {
            // Preferuj listę z calc: dywizje, z których ktoś NIE jest WAITING_ROOM
            return Object.values(calc.byTeamId!).some(
              (a) => a.division_id === d.id && a.status !== "WAITING_ROOM",
            );
          })
          .map((d) => d.tier),
      ),
    ].sort((a, b) => a - b);

    const tierList =
      activeTiers.length > 0
        ? activeTiers
        : Array.from({ length: actualMaxTier }, (_, i) => i + 1);

    const labelByTier = new Map(pyramidDivs.map((d) => [d.tier, d.name]));

    const columnMap = new Map<number, DraftPlayer[]>();
    for (const t of tierList) columnMap.set(t, []);
    const waitingRoom: DraftPlayer[] = [];

    for (const [teamId, a] of Object.entries(calc.byTeamId)) {
      const div = divs.find((d) => d.id === a.division_id);
      if (!div || div.pyramid_id !== activePyramidId) continue;
      const team = teamById.get(teamId);
      if (!team) continue;

      const player: DraftPlayer = {
        teamId,
        tempId: teamId,
        isNew: false,
        cascadePromotion: false,
        originalStatus: a.status,
        oldTier: a.current_tier,
        nextTier: a.next_tier ?? 0,
        pyramidId: activePyramidId,
        oldDivisionId: a.division_id,
        oldDivisionName: calc.divisionNameById?.[a.division_id] ?? div.name,
        totalPoints: a.totalPoints ?? 0,
        fplPoints: a.fplPoints ?? 0,
        position: a.position,
        manager_name: team.manager_name,
        discord_nick: team.discord_nick,
        fpl_id: team.fpl_id,
        fpl_team_name: team.fpl_team_name,
        chosen_club: team.chosen_club,
      };

      if (a.status === "WAITING_ROOM" || a.next_tier == null) {
        waitingRoom.push(player);
        continue;
      }

      const nextTier = Math.min(Math.max(1, a.next_tier), actualMaxTier);
      player.nextTier = nextTier;
      const list = columnMap.get(nextTier) ?? [];
      list.push(player);
      columnMap.set(nextTier, list);
    }

    const columns: DraftColumn[] = [];
    for (const t of tierList) {
      const players = (columnMap.get(t) ?? []).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return b.fplPoints - a.fplPoints;
      });
      columns.push({
        tier: t,
        label: labelByTier.get(t) ?? `Tier ${t}`,
        players,
      });
    }

    const phase = resolveSeasonPhase(season.name);
    const nextPhase = phase === "AUTUMN" ? "SPRING" : "AUTUMN";
    const bergerGwOffset = nextPhase === "SPRING" ? 19 : 0;

    const { count: seasonCount } = await supabase
      .from("seasons")
      .select("id", { count: "exact", head: true });

    const board: DraftBoardState = {
      seasonId: season.id,
      seasonName: season.name,
      pyramidId: activePyramidId,
      pyramidName: pyramids.find((p) => p.id === activePyramidId)?.name ?? "—",
      maxTier: actualMaxTier,
      columns,
      waitingRoom: waitingRoom.sort((a, b) =>
        a.manager_name.localeCompare(b.manager_name, "pl"),
      ),
      resigned: [],
      suggestedNextSeasonName: nextSeasonNameFromCount(seasonCount ?? 0),
      nextPhase,
      bergerGwOffset,
    };

    return {
      error: null,
      board,
      pyramids,
      season: {
        id: season.id,
        name: season.name,
        is_completed: Boolean(season.is_completed),
        is_archived: false,
      },
    };
  } catch (e) {
    console.error("[loadSeasonDraftBoard]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd ładowania draftu.",
    };
  }
}

export type FinalizeResult = ActionState & {
  newSeasonId?: string;
  redirectGw?: number;
};

/**
 * Archiwizuje sezon, tworzy nowy, przenosi graczy, generuje Berger.
 * Uwaga: Supabase JS nie ma pełnych transakcji SQL — operacje sekwencyjne
 * z wczesnym return przy błędzie; krytyczne kroki w możliwie małym oknie.
 */
export async function finalizeSeasonTransition(
  draft: SerializableDraftPayload,
): Promise<FinalizeResult> {
  try {
    const supabase = await requireAuth();
    if (!draft?.seasonId) return { error: "Brak danych draftu." };

    for (const col of draft.columns) {
      if (col.players.length !== DRAFT_TARGET_SIZE) {
        return {
          error: `Tier ${col.tier} ma ${col.players.length}/${DRAFT_TARGET_SIZE} — wyrównaj tablicę.`,
        };
      }
    }

    const { data: oldSeason, error: oldErr } = await supabase
      .from("seasons")
      .select("id, name, is_archived")
      .eq("id", draft.seasonId)
      .maybeSingle();
    if (oldErr) return { error: oldErr.message };
    if (!oldSeason) return { error: "Nie znaleziono sezonu." };
    if (oldSeason.is_archived) {
      return { error: "Sezon już zarchiwizowany." };
    }

    const calc = await runCalculateEndSeasonStatuses(supabase, draft.seasonId);
    if (calc.error || !calc.byTeamId) {
      return {
        error: calc.error ?? "Brak statusów do przeniesienia innych piramid.",
      };
    }

    const { data: oldDivs, error: odErr } = await supabase
      .from("divisions")
      .select("id, name, tier, pyramid_id, discord_webhook_url")
      .eq("season_id", draft.seasonId);
    if (odErr) return { error: odErr.message };

    const allPyramidIds = [
      ...new Set((oldDivs ?? []).map((d) => d.pyramid_id)),
    ];

    // 1) Archiwizacja
    const { error: archErr } = await supabase
      .from("seasons")
      .update({ is_archived: true, is_completed: true, status: "PUBLISHED" })
      .eq("id", draft.seasonId);
    if (archErr) return { error: archErr.message };

    // 2) Nowy sezon
    const newName =
      draft.suggestedNextSeasonName?.trim() ||
      suggestNextSeasonName(oldSeason.name);
    const { data: newSeason, error: nsErr } = await supabase
      .from("seasons")
      .insert({
        name: newName,
        status: "PUBLISHED",
        is_completed: false,
        is_archived: false,
      })
      .select("id, name")
      .single();
    if (nsErr || !newSeason) {
      return { error: nsErr?.message ?? "Nie utworzono nowego sezonu." };
    }

    // 3–5) Dla każdej piramidy: dywizje + gracze + Berger
    const gwOffset = draft.bergerGwOffset ?? 0;
    let fixturesInserted = 0;

    // Rezygnacje (tylko z draftu aktywnej piramidy)
    if (draft.resignedTeamIds.length) {
      const { error: resErr } = await supabase
        .from("teams")
        .update({ is_active: false, division_id: null })
        .in("id", draft.resignedTeamIds);
      if (resErr) return { error: resErr.message };
    }

    // Poczekalnia draftu (niepełne dywizje / świeżacy bez nowej kolumny)
    const waitingIds = draft.waitingRoomTeamIds ?? [];
    if (waitingIds.length) {
      const { error: waitErr } = await supabase
        .from("teams")
        .update({ division_id: null, is_active: true })
        .in("id", waitingIds);
      if (waitErr) return { error: waitErr.message };
    }
    for (const p of draft.waitingRoomNewPlayers ?? []) {
      const { error: nErr } = await supabase.from("teams").insert({
        division_id: null,
        manager_name: p.manager_name,
        discord_nick: p.discord_nick,
        chosen_club: p.chosen_club || "TBD",
        fpl_id: p.fpl_id,
        fpl_team_name: p.fpl_team_name,
        fee_paid: false,
        is_active: true,
      });
      if (nErr) return { error: nErr.message };
    }

    const resignedSet = new Set(draft.resignedTeamIds);

    for (const pyramidId of allPyramidIds) {
      const pyramidOldDivs = (oldDivs ?? []).filter(
        (d) => d.pyramid_id === pyramidId,
      );
      const oldByTier = new Map(pyramidOldDivs.map((d) => [d.tier, d] as const));

      type ColSpec = {
        tier: number;
        label: string;
        players: SerializableDraftPayload["columns"][number]["players"];
      };

      let columns: ColSpec[];

      if (pyramidId === draft.pyramidId) {
        columns = draft.columns;
      } else {
        // Auto: tylko aktywne dywizje (ACTUAL_MAX_TIER); WAITING_ROOM → unassigned
        const actualMax =
          calc.activeMaxTierByPyramid?.[pyramidId] ??
          Math.max(
            ...Object.values(calc.byTeamId)
              .filter((a) => {
                const div = pyramidOldDivs.find((d) => d.id === a.division_id);
                return div && a.status !== "WAITING_ROOM" && a.next_tier != null;
              })
              .map((a) => a.current_tier),
            1,
          );

        const byTier = new Map<number, ColSpec["players"]>();
        for (let t = 1; t <= actualMax; t++) byTier.set(t, []);

        const waitingIds: string[] = [];

        for (const [teamId, a] of Object.entries(calc.byTeamId)) {
          if (resignedSet.has(teamId)) continue;
          const div = pyramidOldDivs.find((d) => d.id === a.division_id);
          if (!div) continue;
          if (a.status === "WAITING_ROOM" || a.next_tier == null) {
            waitingIds.push(teamId);
            continue;
          }
          const nextTier = Math.min(Math.max(1, a.next_tier), actualMax);
          const list = byTier.get(nextTier) ?? [];
          list.push({
            teamId,
            isNew: false,
            manager_name: "",
            discord_nick: "",
            chosen_club: "",
            fpl_id: null,
            fpl_team_name: null,
          });
          byTier.set(nextTier, list);
        }

        if (waitingIds.length) {
          const { error: wErr } = await supabase
            .from("teams")
            .update({ division_id: null, is_active: true })
            .in("id", waitingIds);
          if (wErr) return { error: wErr.message };
        }

        columns = [];
        for (let t = 1; t <= actualMax; t++) {
          const players = byTier.get(t) ?? [];
          if (players.length !== DRAFT_TARGET_SIZE) {
            return {
              error: `Piramida ${pyramidId} Tier ${t}: ${players.length}/${DRAFT_TARGET_SIZE} — wyrównaj lub rozlicz tę piramidę ręcznie (obecnie finalizacja wymaga 10/10 też w innych piramidach).`,
            };
          }
          columns.push({
            tier: t,
            label: oldByTier.get(t)?.name ?? `Tier ${t}`,
            players,
          });
        }
      }

      const newDivByTier = new Map<number, string>();
      for (const col of columns) {
        const old = oldByTier.get(col.tier);
        const { data: nd, error: ndErr } = await supabase
          .from("divisions")
          .insert({
            season_id: newSeason.id,
            pyramid_id: pyramidId,
            name: old?.name ?? col.label ?? `Dywizja ${col.tier}`,
            tier: col.tier,
            discord_webhook_url: old?.discord_webhook_url ?? null,
          })
          .select("id, tier")
          .single();
        if (ndErr || !nd) {
          return { error: ndErr?.message ?? `Błąd dywizji Tier ${col.tier}.` };
        }
        newDivByTier.set(col.tier, nd.id);
      }

      for (const col of columns) {
        const newDivId = newDivByTier.get(col.tier);
        if (!newDivId) continue;
        if (col.players.length !== DRAFT_TARGET_SIZE) {
          return {
            error: `Tier ${col.tier}: ${col.players.length}/${DRAFT_TARGET_SIZE}.`,
          };
        }

        const teamIdsForBerger: string[] = [];
        for (const p of col.players) {
          if (p.isNew || !p.teamId) {
            const { data: created, error: cErr } = await supabase
              .from("teams")
              .insert({
                division_id: newDivId,
                manager_name: p.manager_name,
                discord_nick: p.discord_nick,
                chosen_club: p.chosen_club || "TBD",
                fpl_id: p.fpl_id,
                fpl_team_name: p.fpl_team_name,
                fee_paid: false,
                is_active: true,
              })
              .select("id")
              .single();
            if (cErr || !created) {
              return { error: cErr?.message ?? "Błąd tworzenia świeżaka." };
            }
            teamIdsForBerger.push(created.id);
          } else {
            const { error: uErr } = await supabase
              .from("teams")
              .update({ division_id: newDivId, is_active: true })
              .eq("id", p.teamId);
            if (uErr) return { error: uErr.message };
            teamIdsForBerger.push(p.teamId);
          }
        }

        const shuffled = shuffleInPlace([...teamIdsForBerger]);
        const matches = generateBergerFixtures(shuffled);
        const payload = matches.map((m) => ({
          season_id: newSeason.id,
          division_id: newDivId,
          gameweek: m.gameweek + gwOffset,
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
          is_published: false,
          is_playoff: false,
        }));
        const { error: fErr } = await supabase.from("fixtures").insert(payload);
        if (fErr) return { error: fErr.message };
        fixturesInserted += payload.length;
      }
    }

    revalidateAll();
    const startGw = 1 + gwOffset;
    return {
      error: null,
      success: `Sezon „${oldSeason.name}” zarchiwizowany. Utworzono „${newSeason.name}” · ${allPyramidIds.length} piramid · ${fixturesInserted} meczów Bergera (od GW${startGw}).`,
      newSeasonId: newSeason.id,
      redirectGw: startGw,
    };
  } catch (e) {
    console.error("[finalizeSeasonTransition]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd finalizacji sezonu.",
    };
  }
}
