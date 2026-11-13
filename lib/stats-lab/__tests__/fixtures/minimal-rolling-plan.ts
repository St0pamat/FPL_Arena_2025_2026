import type {
  ReconstructedEntryState,
  ReconstructedSquadPick,
} from "@/lib/stats-lab/fplEntryApi";
import type { FplLabPlayer, FplPositionType } from "@/lib/stats-lab/types";

const GW = 1;

function makePlayer(
  id: number,
  elementType: FplPositionType,
  teamId: number,
  webName: string,
  nowCost = 50,
): FplLabPlayer {
  return {
    season_code: "2025-26",
    fpl_element_id: id,
    player_code: 10_000 + id,
    first_name: "Test",
    second_name: webName,
    web_name: webName,
    fpl_team_id: teamId,
    element_type: elementType,
    status: "a",
    now_cost: nowCost,
    selected_by_percent: 5,
    total_points: 20,
    event_points: 2,
    form: 3,
    points_per_game: 3,
    value_form: 0.5,
    value_season: 0.4,
    dreamteam_count: 0,
    transfers_in: 0,
    transfers_out: 0,
    transfers_in_event: 0,
    transfers_out_event: 0,
    cost_change_start: 0,
    cost_change_event: 0,
    chance_of_playing_next_round: 100,
    news: null,
    ep_next: 3,
    defensive_contribution: 0,
    minutes: 90,
    starts: 1,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 1,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    bps: 10,
    influence: 10,
    creativity: 10,
    threat: 10,
    ict_index: 3,
    expected_goals: 0,
    expected_assists: 0,
    expected_goal_involvements: 0,
    expected_goals_conceded: 0.5,
    recoveries: 0,
    tackles: 0,
    interceptions: 0,
    clearances_blocks_interceptions: 0,
    penalties_order: null,
    corners_and_indirect_freekicks_order: null,
    direct_freekicks_order: null,
    last_synced_gw: GW,
    updated_at: "2025-08-01T00:00:00.000Z",
  };
}

/** 15-player fixture: 2 GKP, 5 DEF, 5 MID, 3 FWD across 8 clubs (≤3 each). */
export const FIXTURE_PLAYERS: FplLabPlayer[] = [
  makePlayer(1, 1, 1, "GK1", 45),
  makePlayer(2, 1, 2, "GK2", 40),
  makePlayer(3, 2, 1, "DEF1", 50),
  makePlayer(4, 2, 2, "DEF2", 45),
  makePlayer(5, 2, 3, "DEF3", 45),
  makePlayer(6, 2, 4, "DEF4", 40),
  makePlayer(7, 2, 5, "DEF5", 40),
  makePlayer(8, 3, 3, "MID1", 70),
  makePlayer(9, 3, 4, "MID2", 65),
  makePlayer(10, 3, 5, "MID3", 60),
  makePlayer(11, 3, 6, "MID4", 55),
  makePlayer(12, 3, 7, "MID5", 50),
  makePlayer(13, 4, 6, "FWD1", 80),
  makePlayer(14, 4, 7, "FWD2", 75),
  makePlayer(15, 4, 8, "FWD3", 70),
];

export const FIXTURE_PLAYERS_BY_ID = new Map(
  FIXTURE_PLAYERS.map((p) => [p.fpl_element_id, p]),
);

function makePick(
  elementId: number,
  slot: number,
  isCaptain = false,
  isViceCaptain = false,
): ReconstructedSquadPick {
  const player = FIXTURE_PLAYERS_BY_ID.get(elementId)!;
  const nowCostTenths = player.now_cost;
  return {
    elementId,
    slot,
    isCaptain,
    isViceCaptain,
    purchasePriceTenths: nowCostTenths,
    nowCostTenths,
    sellingPriceTenths: nowCostTenths,
    priceSource: "derived",
    priceApprox: false,
    willDropAffectSell: false,
  };
}

/** Formation 1-3-4-3 XI + bench; no transfers; single GW horizon. */
export const FIXTURE_ENTRY: ReconstructedEntryState = {
  teamId: 999001,
  teamName: "Smoke Test FC",
  managerName: "Test Manager",
  startedEvent: 1,
  currentGw: 0,
  planningStartGw: GW,
  isPreseason: true,
  activeChipInCurrentGw: null,
  rolledBackFromFreeHit: false,
  bankTenths: 5,
  bankSource: "derived",
  freeTransfers: 1,
  freeTransfersSource: "derived",
  ftMismatchWarning: false,
  squadSellingValueTenths: 1000,
  squadMarketValueTenths: 1000,
  spendingPowerTenths: 1005,
  valueConsistencyDeltaTenths: 0,
  picks: [
    makePick(1, 1, true, false),
    makePick(3, 2),
    makePick(4, 3),
    makePick(5, 4),
    makePick(8, 5),
    makePick(9, 6),
    makePick(10, 7),
    makePick(11, 8),
    makePick(13, 9, false, true),
    makePick(14, 10),
    makePick(15, 11),
    makePick(2, 12),
    makePick(6, 13),
    makePick(7, 14),
    makePick(12, 15),
  ],
  usedChips: [],
  overLimitClubIds: [],
  warnings: [],
};

export const FIXTURE_START_GW = GW;
export const FIXTURE_END_GW = GW;
