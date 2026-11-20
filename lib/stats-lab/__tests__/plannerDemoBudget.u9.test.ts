import { describe, expect, it } from "vitest";
import {
  buildDemoEntryState,
  pickDemoSquadPlayers,
} from "@/lib/stats-lab/plannerEngine";
import type { FplLabPlayer, FplPositionType } from "@/lib/stats-lab/types";

function player(args: {
  id: number;
  type: FplPositionType;
  team: number;
  cost: number;
  points: number;
}): FplLabPlayer {
  return {
    status: "a",
    now_cost: args.cost,
    total_points: args.points,
    minutes: 900,
    selected_by_percent: 10,
    form: 4,
    cost_change_start: 0,
    element_type: args.type,
    fpl_team_id: args.team,
    fpl_element_id: args.id,
    web_name: `P${args.id}`,
  } as FplLabPlayer;
}

function catalog(): FplLabPlayer[] {
  const rows: FplLabPlayer[] = [];
  const add = (type: FplPositionType, count: number, cost: number, points: number, teamBase: number) => {
    for (let i = 0; i < count; i += 1) {
      rows.push(
        player({
          id: rows.length + 1,
          type,
          team: teamBase + (i % 8),
          cost,
          points: points - i,
        }),
      );
    }
  };
  add(1, 4, 50, 80, 1);
  add(2, 10, 55, 90, 1);
  add(3, 10, 70, 120, 1);
  add(4, 6, 85, 140, 1);
  add(1, 2, 40, 5, 20);
  add(2, 6, 40, 5, 20);
  add(3, 6, 45, 5, 20);
  add(4, 4, 45, 5, 20);
  return rows;
}

describe("U9 skład demo", () => {
  it("bank nie schodzi poniżej zera i skład mieści się w £100.0m", () => {
    const players = catalog();
    const picked = pickDemoSquadPlayers(players);
    const spent = picked.reduce((sum, row) => sum + row.now_cost, 0);
    expect(picked.length).toBe(15);
    expect(spent).toBeLessThanOrEqual(1000);

    const entry = buildDemoEntryState({
      players,
      planningStartGw: 11,
      projectionsByElement: {},
    });
    expect(entry.bankTenths).toBeGreaterThanOrEqual(0);
    expect(entry.bankSource).toBe("derived");
    expect(entry.squadMarketValueTenths + entry.bankTenths).toBeLessThanOrEqual(1000);
    expect(entry.teamId).toBe(0);
  });

  it("same drogie karty nie dają ujemnego banku", () => {
    const stars = [1, 2, 3, 4].flatMap((type) =>
      Array.from({ length: 6 }, (_, index) =>
        player({
          id: type * 100 + index,
          type: type as FplPositionType,
          team: index + 1,
          cost: 130,
          points: 200 - index,
        }),
      ),
    );
    const entry = buildDemoEntryState({
      players: stars,
      planningStartGw: 11,
      projectionsByElement: {},
    });
    expect(entry.bankTenths).toBeGreaterThanOrEqual(0);
    expect(entry.squadMarketValueTenths).toBeLessThanOrEqual(1000);
  });

  it("uzupełnienie budżetu zostaje w limicie pozycji i tylko wśród dostępnych", () => {
    const rows: FplLabPlayer[] = [];
    const push = (
      type: FplPositionType,
      count: number,
      cost: number,
      points: number,
      status = "a",
      teamBase = 1,
    ) => {
      for (let i = 0; i < count; i += 1) {
        rows.push({
          ...player({
            id: rows.length + 1,
            type,
            team: teamBase + i,
            cost,
            points,
          }),
          status,
        } as FplLabPlayer);
      }
    };
    push(1, 2, 90, 200, "a", 1);
    push(2, 5, 90, 200, "a", 1);
    push(3, 5, 90, 200, "a", 1);
    push(4, 3, 90, 200, "a", 1);
    push(1, 2, 40, 1, "a", 40);
    push(2, 5, 40, 1, "a", 40);
    push(3, 5, 40, 1, "a", 40);
    push(4, 3, 40, 1, "a", 40);
    push(1, 4, 40, 50, "u", 80);
    const picked = pickDemoSquadPlayers(rows);
    const count = (type: FplPositionType) =>
      picked.filter((row) => row.element_type === type).length;
    expect(picked).toHaveLength(15);
    expect(count(1)).toBe(2);
    expect(count(2)).toBe(5);
    expect(count(3)).toBe(5);
    expect(count(4)).toBe(3);
    expect(picked.every((row) => row.status === "a")).toBe(true);
  });
});
