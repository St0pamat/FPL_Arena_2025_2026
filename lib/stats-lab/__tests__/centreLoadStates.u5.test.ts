import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  centreEmptyFilterMessage,
  centreUi,
  logStatsCentreLoadError,
} from "@/lib/stats-lab/statsCentreI18n";
import { createDefaultStatsCentreFilter } from "@/lib/stats-lab/statsCentreEngine";

const ROOT = path.resolve(__dirname, "../../..");

describe("U5/U5b Centre: błąd ≠ pusty wynik", () => {
  it("createDefaultStatsCentreFilter: minMinutes 1, bez pozycji (nie DEF_COMPLETE)", () => {
    const f = createDefaultStatsCentreFilter("2025-26");
    expect(f.minMinutes).toBe(1);
    expect(f.positions).toEqual([]);
    expect(f.centreMode).toBe("PLAYERS");
  });

  it("pusty wynik → komunikat o filtrach (pozycja + minuty > 1)", () => {
    expect(
      centreEmptyFilterMessage("pl", {
        positions: [2],
        minMinutes: 180,
        centreMode: "PLAYERS",
      }),
    ).toBe("Brak obrońców z min. 180 min. Zmniejsz minimalne minuty.");
    expect(
      centreEmptyFilterMessage("en", {
        positions: [2],
        minMinutes: 180,
        centreMode: "PLAYERS",
      }),
    ).toBe("No defenders with min. 180 min. Lower the minutes filter.");
  });

  it("emptyFiltered: bez pozycji, kilka pozycji, minMinutes 0 i 1 — nigdy „min. 0 min”", () => {
    for (const min of [0, 1]) {
      const none = centreEmptyFilterMessage("pl", {
        positions: [],
        minMinutes: min,
        centreMode: "PLAYERS",
      });
      expect(none).not.toMatch(/min\.\s*0\s*min/);
      expect(none).not.toMatch(/min\.\s*1\s*min/);
      expect(none).toBe(centreUi("pl").empty);

      const one = centreEmptyFilterMessage("pl", {
        positions: [2],
        minMinutes: min,
        centreMode: "PLAYERS",
      });
      expect(one).toMatch(/Brak obrońców/);
      expect(one).not.toMatch(/min\.\s*0\s*min/);
      expect(one).not.toMatch(/min\.\s*1\s*min/);

      const multi = centreEmptyFilterMessage("pl", {
        positions: [2, 3],
        minMinutes: min,
        centreMode: "PLAYERS",
      });
      expect(multi).toMatch(/wybranych pozycjach \(Obrońcy, Pomocnicy\)/);
      expect(multi).not.toMatch(/min\.\s*0\s*min/);
    }

    expect(
      centreEmptyFilterMessage("en", {
        positions: [2, 4],
        minMinutes: 90,
        centreMode: "PLAYERS",
      }),
    ).toMatch(/selected positions \(DEF, FWD\).*min\. 90 min/);
  });

  it("loadError i18n PL/EN", () => {
    expect(centreUi("pl").loadError).toMatch(/Nie udało się wczytać/);
    expect(centreUi("en").loadError).toMatch(/Couldn't load data/);
    expect(centreUi("pl").retry).toBe("Spróbuj ponownie");
    expect(centreUi("en").retry).toBe("Try again");
  });

  it("logStatsCentreLoadError → console.error z action/message/code", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("fetch failed"), { code: "NETWORK" });
    logStatsCentreLoadError(err);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe("[Stats Centre] load failed");
    expect(spy.mock.calls[0]?.[1]).toEqual({
      action: "queryStatsCentreAction",
      message: "fetch failed",
      code: "NETWORK",
    });
    spy.mockRestore();
  });

  it("retry: tylko ręczny odczyt, disabled przy pending, log w akcji serwerowej", () => {
    const view = readFileSync(
      path.join(ROOT, "components/admin/stats-lab/StatsCentreView.tsx"),
      "utf8",
    );
    expect(view).toMatch(/data-centre-retry="true"/);
    expect(view).toMatch(/disabled=\{pending\}/);
    expect(view).toMatch(/if \(pending\) return;/);
    // useEffect zależy od filter — nie od error (brak auto-pętli po błędzie)
    expect(view).toMatch(
      /}, \[bootstrap\.players\.length, filter, runQuery\]\);/,
    );

    const action = readFileSync(
      path.join(ROOT, "app/admin/actions/statsLabCentre.ts"),
      "utf8",
    );
    expect(action).toMatch(/logStatsCentreLoadError/);
    expect(action).toMatch(/throw err/);
  });
});
