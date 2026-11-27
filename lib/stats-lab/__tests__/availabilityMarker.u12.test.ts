import { describe, expect, it } from "vitest";
import {
  buildAvailabilityDetail,
  mapAvailabilityMarker,
} from "@/lib/stats-lab/availabilityMarker";

describe("U12 znacznik dostępności FPL", () => {
  it("mapuje 75 na żółty, 50 na pomarańczowy, 25 i 0 na czerwony", () => {
    const yellow = mapAvailabilityMarker({
      status: "d",
      chanceOfPlayingNextRound: 75,
    });
    const orange = mapAvailabilityMarker({
      status: "d",
      chanceOfPlayingNextRound: 50,
    });
    const red = mapAvailabilityMarker({
      status: "d",
      chanceOfPlayingNextRound: 25,
    });
    const zero = mapAvailabilityMarker({
      status: "d",
      chanceOfPlayingNextRound: 0,
    });
    expect(yellow).toMatchObject({ visible: true, tone: "yellow", badge: "75" });
    expect(orange).toMatchObject({ visible: true, tone: "orange", badge: "50" });
    expect(red).toMatchObject({ visible: true, tone: "red", badge: "25" });
    expect(zero).toMatchObject({ visible: true, tone: "red", badge: "0" });
  });

  it("kontuzja bez procentu to plus, zawieszenie to S", () => {
    expect(
      mapAvailabilityMarker({ status: "i", chanceOfPlayingNextRound: null }),
    ).toMatchObject({ visible: true, tone: "red", kind: "injury", badge: "+" });
    expect(
      mapAvailabilityMarker({ status: "s", chanceOfPlayingNextRound: 0 }),
    ).toMatchObject({
      visible: true,
      tone: "red",
      kind: "suspension",
      badge: "S",
    });
  });

  it("dostępny przy 100 albo bez procentu nie dostaje plakietki", () => {
    expect(
      mapAvailabilityMarker({ status: "a", chanceOfPlayingNextRound: 100 }).visible,
    ).toBe(false);
    expect(
      mapAvailabilityMarker({ status: "a", chanceOfPlayingNextRound: null }).visible,
    ).toBe(false);
  });

  it("wątpliwy bez procentu zostaje widoczny", () => {
    expect(
      mapAvailabilityMarker({ status: "d", chanceOfPlayingNextRound: null }),
    ).toMatchObject({ visible: true, kind: "doubt", badge: "?" });
  });

  it("brak kolumny tej kolejki i news_added opisuje źródło bootstrap-static", () => {
    const lines = buildAvailabilityDetail("pl", {
      status: "d",
      chanceOfPlayingNextRound: 75,
      news: "Hamstring — 75% chance of playing",
    });
    const byId = Object.fromEntries(lines.map((line) => [line.id, line]));
    expect(byId.chanceNext?.value).toBe("75%");
    expect(byId.news?.value).toContain("Hamstring");
    expect(byId.chanceThis?.hint).toContain("chance_of_playing_this_round");
    expect(byId.chanceThis?.hint).toContain("bootstrap-static");
    expect(byId.newsAdded?.hint).toContain("news_added");
    expect(byId.newsAdded?.value).toBe("—");
  });
});
