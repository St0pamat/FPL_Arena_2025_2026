/** @vitest-environment jsdom */
/**
 * U3 domknięcie: wcześniej listPlannerControlAccessibleNames to tylko katalog.
 * Ten test renderuje powierzchnie Planera i sprawdza każdy button / [role=button].
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type {
  EvaluatedGwState,
  PlayerGwProjection,
} from "@/lib/stats-lab/plannerEngine";
import { shellLabel } from "@/lib/stats-lab/i18n";
import { pt, ptTip } from "@/lib/stats-lab/plannerI18n";
import { PlannerHeaderAndControls } from "@/components/admin/stats-lab/planner/PlannerHeaderAndControls";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import { PlannerMultiGwTable } from "@/components/admin/stats-lab/planner/PlannerMultiGwTable";
import { PlannerMarketSidebar } from "@/components/admin/stats-lab/planner/PlannerMarketSidebar";

function catalog(
  id: number,
  name: string,
  club: string,
  elementType: 1 | 2 | 3 | 4 = 3,
): PlannerPlayerCatalogItem {
  return {
    fpl_element_id: id,
    player_code: id * 10,
    web_name: name,
    first_name: name,
    second_name: name,
    element_type: elementType,
    fpl_team_id: id,
    club_short_name: club,
    club_pulse_code: null,
    now_cost: 70,
    cost_change_start: 0,
    status: "a",
    chance_of_playing_next_round: 100,
    news: "",
    selected_by_percent: 10,
    total_points: 40,
    event_points: 0,
    form: 5,
    points_per_game: 5,
    value_season: 10,
    minutes: 900,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    expected_goals: 0,
    expected_assists: 0,
    expected_goal_involvements: 0,
    defensive_contribution: 0,
    dc_bonus_points: 0,
    transfers_in_event: 0,
    transfers_out_event: 0,
  };
}

function elementTypeForSlot(slot: number): 1 | 2 | 3 | 4 {
  if (slot === 1 || slot === 12) return 1;
  if (slot >= 2 && slot <= 5) return 2;
  if (slot >= 6 && slot <= 8) return 3;
  if (slot >= 9 && slot <= 11) return 4;
  return 3;
}

function pick(
  id: number,
  slot: number,
  opts: { captain?: boolean; vice?: boolean } = {},
): ReconstructedSquadPick {
  return {
    elementId: id,
    slot,
    isCaptain: !!opts.captain,
    isViceCaptain: !!opts.vice,
    purchasePriceTenths: 70,
    nowCostTenths: 70,
    sellingPriceTenths: 70,
    priceSource: "api",
    priceApprox: false,
    willDropAffectSell: false,
  };
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label")?.trim() ?? "";
  if (aria) return aria;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  const title = el.getAttribute("title")?.trim() ?? "";
  if (title) return title;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function assertAllButtonsNamed(root: HTMLElement, lang: string) {
  const nodes = root.querySelectorAll('button, [role="button"]');
  expect(nodes.length, `${lang} expected interactive controls`).toBeGreaterThan(
    10,
  );
  const empty: string[] = [];
  nodes.forEach((el, idx) => {
    const name = accessibleName(el);
    if (!name) {
      empty.push(
        `${idx}:${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 60)}`,
      );
    }
  });
  expect(empty, `${lang} empty accessible names`).toEqual([]);
}

describe("U3 a11y render — every button / role=button in Planner surfaces", () => {
  it("renders Header + Pitch + MultiGw + Market + theme control; all controls named (PL and EN)", () => {
    const picks: ReconstructedSquadPick[] = [];
    const playersById = new Map<number, PlannerPlayerCatalogItem>();
    for (let slot = 1; slot <= 15; slot++) {
      const id = slot;
      picks.push(
        pick(id, slot, {
          captain: slot === 7,
          vice: slot === 9,
        }),
      );
      playersById.set(
        id,
        catalog(id, slot === 7 ? "Salah" : slot === 9 ? "Haaland" : `P${slot}`, "ARS", elementTypeForSlot(slot)),
      );
    }

    const projectionsByElement: Record<
      number,
      Record<number, PlayerGwProjection>
    > = {};
    for (const p of picks) {
      projectionsByElement[p.elementId] = {
        10: {
          elementId: p.elementId,
          gameweek: 10,
          xPts: 4,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.8,
          p1: 0.9,
          isBlank: false,
          isDouble: false,
          fixtures: [
            {
              fixtureId: 1,
              matchXPts: 4,
              expectedMinutes: 80,
              p0: 0.1,
              p60: 0.8,
              p1: 0.9,
              opponentShortName: "NFO",
              tickerLabel: "ignored",
              isHome: true,
              fdrLevel: 3,
            },
          ],
        },
      };
    }

    const marketPlayers = [
      catalog(101, "Saka", "ARS", 3),
      catalog(102, "Palmer", "CHE", 3),
    ];
    const evaluated: EvaluatedGwState = {
      gw: 10,
      squad: picks.map((p) => ({
        elementId: p.elementId,
        slot: p.slot,
        purchasePriceTenths: p.purchasePriceTenths,
        nowCostTenths: p.nowCostTenths,
        sellingPriceTenths: p.sellingPriceTenths,
        isCaptain: p.isCaptain,
        isViceCaptain: p.isViceCaptain,
      })),
      bankTenths: 10,
      ftAvailable: 1,
      ftNext: 1,
      activeChip: null,
      transfers: [],
      validTransfersCount: 0,
      hitsCount: 0,
      transferCostPts: 0,
      captainElementId: 7,
      viceCaptainElementId: 9,
      isValid: true,
      errors: [],
      warnings: [],
      grossXPts: 40,
      netXPts: 40,
    };

    const draftSummaries = (
      ["A", "B", "C"] as const
    ).map((variant) => ({
      variant,
      xPtsNextGw: 40,
      xPtsHorizonSum: 40,
      xPtsHorizonNet: 40,
      ftNextGw: 1,
      ftEndOfPlan: 1,
      totalHitPts: 0,
      finalBankTenths: 10,
      chipsByGw: {},
    }));

    for (const lang of ["pl", "en"] as const) {
      const { container, unmount } = render(
        <div data-testid={`planner-a11y-${lang}`}>
          <button type="button" aria-label={shellLabel(lang, "shell.aria.theme")}>
            theme
          </button>
          <PlannerHeaderAndControls
            themeId="ARENA_DARK"
            lang={lang}
            teamIdInput="1"
            onTeamIdInputChange={() => undefined}
            onLoadTeam={() => undefined}
            onLoadDemo={() => undefined}
            activeVariant="A"
            onSelectVariant={() => undefined}
            onCopyVariantTo={() => undefined}
            draftSummaries={draftSummaries}
            planningStartGw={10}
            planningEndGw={11}
            currentGw={10}
            availableGameweeks={[10, 11]}
            onSelectGw={() => undefined}
            freeTransfers={1}
            freeTransfersSource="api"
            hitsCostPts={0}
            bankTenths={10}
            bankSource="api"
            grossXPts={40}
            netXPts={40}
            spendingPowerTenths={100}
            activeChip={null}
            usedChipsByType={{}}
            onToggleChip={() => undefined}
            tileMetric="FIXTURES"
            onTileMetricChange={() => undefined}
            onOptimiseXi={() => undefined}
            onUndo={() => undefined}
            onResetGw={() => undefined}
            onResetPlan={() => undefined}
            canUndo
            onManualSetFt={() => undefined}
            onManualAdjustBankTenths={() => undefined}
          />
          <PlannerPitch
            themeId="ARENA_DARK"
            lang={lang}
            currentGw={10}
            availableGameweeks={[10, 11]}
            squadPicks={picks}
            selectedSlotForSwap={null}
            playersById={playersById}
            projectionsByElement={projectionsByElement}
            tileMetric="FIXTURES"
            onSelectSlotForSwap={() => undefined}
            onSwapSlots={() => undefined}
            onMarkPlayerForTransferOut={() => undefined}
            onSetCaptain={() => undefined}
            onSetViceCaptain={() => undefined}
            watchlistIds={new Set()}
            onToggleWatchlist={() => undefined}
            activeChip={null}
          />
          <PlannerMultiGwTable
            themeId="ARENA_DARK"
            lang={lang}
            availableGameweeks={[10, 11]}
            squadPicks={picks}
            playersById={playersById}
            projectionsByElement={projectionsByElement}
            activeChip={null}
            onOpenPlayerInfo={() => undefined}
          />
          <PlannerMarketSidebar
            themeId="ARENA_DARK"
            lang={lang}
            currentGw={10}
            planningStartGw={10}
            availableGameweeks={[10, 11]}
            clubs={[
              {
                fpl_team_id: 1,
                name: "Arsenal",
                short_name: "ARS",
                pulse_code: null,
              },
              {
                fpl_team_id: 2,
                name: "Chelsea",
                short_name: "CHE",
                pulse_code: null,
              },
            ]}
            players={marketPlayers}
            playersById={new Map(marketPlayers.map((p) => [p.fpl_element_id, p]))}
            projectionsByElement={{
              101: projectionsByElement[7]!,
              102: projectionsByElement[9]!,
            }}
            squadPicks={picks}
            watchlistIds={new Set()}
            onToggleWatchlist={() => undefined}
            pendingTransferOut={null}
            onClearPendingTransferOut={() => undefined}
            availableBudgetTenths={50}
            bankTenths={10}
            onExecuteTransfer={() => undefined}
            onOpenPlayerInfo={() => undefined}
            evaluatedGws={[evaluated]}
            squadMarketValueTenths={1000}
            squadSellingValueTenths={1000}
            spendingPowerTenths={1010}
            plannedTransferCount={0}
          />
        </div>,
      );

      const root = screen.getByTestId(`planner-a11y-${lang}`);
      assertAllButtonsNamed(root, lang);

      // Sanity: kluczowe kontrolki z promptu
      expect(
        within(root).getByRole("button", {
          name: shellLabel(lang, "shell.aria.theme"),
        }),
      ).toBeTruthy();
      expect(
        within(root).getByRole("button", {
          name: ptTip(lang, "planner.gw.prev"),
        }),
      ).toBeTruthy();
      expect(
        within(root).getByRole("button", {
          name: ptTip(lang, "planner.gw.next"),
        }),
      ).toBeTruthy();
      expect(
        within(root).getAllByRole("button", {
          name: lang === "pl" ? /Kapitan: Salah/ : /Captain: Salah/,
        }).length,
      ).toBeGreaterThan(0);
      expect(
        within(root).getAllByRole("button", {
          name: lang === "pl" ? /Wicekapitan: Salah/ : /Vice-captain: Salah/,
        }).length,
      ).toBeGreaterThan(0);
      expect(
        within(root).getAllByRole("button", {
          name:
            lang === "pl"
              ? /Dodaj: Saka|Nie stać|Już w składzie|Limit/
              : /Add: Saka|Can't afford|Already in|Limit/,
        }).length,
      ).toBeGreaterThan(0);
      expect(
        within(root).getAllByRole("button", {
          name:
            lang === "pl"
              ? new RegExp(pt(lang, "planner.horizon.tab.fixturesPts"))
              : new RegExp(pt(lang, "planner.horizon.tab.fixturesPts")),
        }).length,
      ).toBeGreaterThan(0);

      expect(container.querySelectorAll('button, [role="button"]').length).toBe(
        root.querySelectorAll('button, [role="button"]').length,
      );
      unmount();
    }
  });
});
