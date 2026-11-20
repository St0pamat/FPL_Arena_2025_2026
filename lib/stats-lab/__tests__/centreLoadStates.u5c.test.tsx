/** @vitest-environment jsdom */
/**
 * U5c: brak danych ≠ pusta lista. Pula 0 tylko po odpowiedzi z 0 wierszy.
 */
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { queryStatsCentreAction } from "@/app/admin/actions/statsLabCentre";
import { StatsCentreView } from "@/components/admin/stats-lab/StatsCentreView";
import type { StatsLabBootstrapData } from "@/lib/stats-lab/analyticsEngine";
import { loadCentrePageBoot } from "@/lib/stats-lab/centrePageBoot";
import { centreUi } from "@/lib/stats-lab/statsCentreI18n";
import type {
  StatsCentreResult,
  StatsCentreRow,
} from "@/lib/stats-lab/statsCentreEngine";

vi.mock("@/app/admin/actions/statsLabCentre", () => ({
  queryStatsCentreAction: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const queryMock = queryStatsCentreAction as unknown as ReturnType<typeof vi.fn>;
const ROOT = path.resolve(__dirname, "../../..");

function makeBootstrap(playerCount: number): StatsLabBootstrapData {
  return {
    seasonCode: "2026/27",
    meta: null,
    clubs: [],
    players: Array.from({ length: playerCount }, (_, i) => ({
      fpl_element_id: i + 1,
      web_name: `P${i + 1}`,
      first_name: "A",
      second_name: "B",
      element_type: 3 as const,
      fpl_team_id: 1,
      now_cost: 50,
      selected_by_percent: 1,
      total_points: 10,
      minutes: 90,
      status: "a",
    })),
    maxGw: 10,
  };
}

function makeResult(totalRows: number): StatsCentreResult {
  const row: StatsCentreRow = {
    id: "r1",
    fpl_element_id: 1,
    fpl_team_id: 1,
    web_name: "Haaland",
    club_short: "MCI",
    club_name: "Man City",
    player_code: null,
    club_pulse_code: null,
    element_type: 4,
    position_label: "FWD",
    values: {},
    colorNorm: {},
  };
  return {
    mode: "PLAYERS",
    columns: [],
    rows: totalRows === 0 ? [] : [row],
    totalRows,
    maxGw: 10,
    effectiveLabel: "1–10",
    poolAverages: {},
  };
}

function poolEl(): HTMLElement {
  const el = document.querySelector("[data-centre-pool]");
  if (!(el instanceof HTMLElement)) throw new Error("brak licznika puli");
  return el;
}

function renderCentre(
  opts: {
    players?: number;
    lang?: "pl" | "en";
    initialResult?: StatsCentreResult | null;
    initialLoadError?: boolean;
    queryTimeoutMs?: number;
  } = {},
) {
  return render(
    <StatsCentreView
      bootstrap={makeBootstrap(opts.players ?? 3)}
      lang={opts.lang ?? "pl"}
      onLangChange={() => undefined}
      themeId="ANALYST_LIGHT"
      initialResult={opts.initialResult ?? null}
      initialLoadError={opts.initialLoadError ?? false}
      queryTimeoutMs={opts.queryTimeoutMs ?? 8000}
    />,
  );
}

describe("U5c Centre: ładowanie, pusta pula, błąd", () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("brak danych → Wczytywanie graczy i Pula: —, nigdy 0", async () => {
    let resolveQuery: (value: StatsCentreResult) => void = () => undefined;
    queryMock.mockImplementation(
      () =>
        new Promise<StatsCentreResult>((resolve) => {
          resolveQuery = resolve;
        }),
    );
    renderCentre();
    expect(screen.getByText(centreUi("pl").loadingPlayers)).toBeTruthy();
    expect(poolEl().getAttribute("data-centre-pool")).toBe("none");
    expect(poolEl().textContent).toContain(centreUi("pl").poolUnknown);
    expect(poolEl().textContent).not.toMatch(/Pula:\s*0\b/);
    expect(screen.queryByText(centreUi("pl").empty)).toBeNull();
    expect(document.querySelector('[data-centre-table-state="loading"]')).toBeTruthy();

    const seen = new Set<string>([poolEl().getAttribute("data-centre-pool") ?? ""]);
    const obs = new MutationObserver(() => {
      seen.add(poolEl().getAttribute("data-centre-pool") ?? "");
    });
    obs.observe(poolEl(), { attributes: true, attributeFilter: ["data-centre-pool"] });

    await waitFor(() => expect(queryMock).toHaveBeenCalled());
    const filter = queryMock.mock.calls[0]?.[0] as {
      minMinutes: number;
      positions: number[];
      centreMode: string;
    };
    expect(filter.minMinutes).toBe(1);
    expect(filter.positions).toEqual([]);
    expect(filter.centreMode).toBe("PLAYERS");

    resolveQuery(makeResult(459));
    await waitFor(() => expect(poolEl().getAttribute("data-centre-pool")).toBe("459"));
    obs.disconnect();
    expect(seen.has("0")).toBe(false);
    expect(poolEl().textContent).toContain("Pula: 459");
    expect(screen.queryByText(centreUi("pl").loadingPlayers)).toBeNull();
    expect(screen.queryByText(centreUi("pl").empty)).toBeNull();
  });

  it("EN: Loading players… gdy danych jeszcze nie ma", () => {
    queryMock.mockImplementation(() => new Promise(() => undefined));
    renderCentre({ lang: "en" });
    expect(screen.getByText(centreUi("en").loadingPlayers)).toBeTruthy();
    expect(poolEl().textContent).toContain(centreUi("en").poolUnknown);
    expect(poolEl().textContent).not.toMatch(/Pool:\s*0\b/);
  });

  it("[] → Pula: 0 i brak wierszy, bez szkieletu", async () => {
    queryMock.mockResolvedValue(makeResult(0));
    renderCentre();
    await waitFor(() => {
      expect(screen.getByText(centreUi("pl").empty)).toBeTruthy();
    });
    expect(poolEl().getAttribute("data-centre-pool")).toBe("0");
    expect(poolEl().textContent).toContain("Pula: 0");
    expect(screen.queryByText(centreUi("pl").loadingPlayers)).toBeNull();
    expect(screen.queryByRole("button", { name: centreUi("pl").retry })).toBeNull();
    expect(document.querySelector('[data-centre-table-state="empty"]')).toBeTruthy();
  });

  it("błąd zapytania → Spróbuj ponownie, nie pusta lista", async () => {
    queryMock.mockRejectedValue(new Error("network"));
    renderCentre();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: centreUi("pl").retry }),
      ).toBeTruthy();
    });
    expect(screen.getAllByText(centreUi("pl").loadError).length).toBeGreaterThan(0);
    expect(poolEl().textContent).toContain(centreUi("pl").poolUnknown);
    expect(poolEl().getAttribute("data-centre-pool")).not.toBe("0");
    expect(screen.queryByText(centreUi("pl").empty)).toBeNull();
    expect(screen.queryByText(centreUi("pl").loadingPlayers)).toBeNull();
    expect(document.querySelector('[data-centre-table-state="error"]')).toBeTruthy();
  });

  it("wiszący fetch klienta przechodzi w błąd z retry", async () => {
    queryMock.mockImplementation(() => new Promise(() => undefined));
    renderCentre({ queryTimeoutMs: 350 });
    expect(screen.getByText(centreUi("pl").loadingPlayers)).toBeTruthy();
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: centreUi("pl").retry }),
        ).toBeTruthy();
      },
      { timeout: 2000 },
    );
    expect(screen.queryByText(centreUi("pl").loadingPlayers)).toBeNull();
    expect(poolEl().textContent).not.toMatch(/Pula:\s*0\b/);
  });

  it("błąd danych startowych od razu pokazuje retry i nie woła zapytania sam", async () => {
    queryMock.mockResolvedValue(makeResult(459));
    renderCentre({ initialLoadError: true, queryTimeoutMs: 5000 });
    expect(
      screen.getByRole("button", { name: centreUi("pl").retry }),
    ).toBeTruthy();
    expect(screen.queryByText(centreUi("pl").loadingPlayers)).toBeNull();
    await new Promise((r) => setTimeout(r, 280));
    expect(queryMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: centreUi("pl").retry }));
    await waitFor(() => expect(poolEl().getAttribute("data-centre-pool")).toBe("459"));
  });

  it("F5 ?tab=centre: domyślny filtr, licznik nigdy nie jest 0 i kończy jak pierwsze wejście", async () => {
    queryMock.mockResolvedValue(makeResult(459));
    const first = renderCentre();
    await waitFor(() => expect(poolEl().getAttribute("data-centre-pool")).toBe("459"));
    const firstCount = poolEl().getAttribute("data-centre-pool");
    first.unmount();

    const boot = await loadCentrePageBoot({
      tab: "centre",
      seasonCode: "2026/27",
      load: async (filter) => {
        expect(filter.minMinutes).toBe(1);
        expect(filter.positions).toEqual([]);
        expect(filter.centreMode).toBe("PLAYERS");
        expect(filter.playerTab).toBe("OVERVIEW");
        expect(filter.sortKey).toBe("total_points");
        return makeResult(459);
      },
    });
    expect(boot.initialError).toBe(false);
    expect(boot.initialResult?.totalRows).toBe(Number(firstCount));

    queryMock.mockClear();
    renderCentre({
      initialResult: boot.initialResult,
      queryTimeoutMs: 5000,
    });
    const seen = new Set<string>([poolEl().getAttribute("data-centre-pool") ?? ""]);
    const obs = new MutationObserver(() => {
      seen.add(poolEl().getAttribute("data-centre-pool") ?? "");
    });
    obs.observe(poolEl(), { attributes: true, attributeFilter: ["data-centre-pool"] });
    expect(poolEl().getAttribute("data-centre-pool")).toBe("459");
    expect(poolEl().textContent).toContain("Pula: 459");
    await new Promise((r) => setTimeout(r, 300));
    obs.disconnect();
    expect(seen.has("0")).toBe(false);
    expect(poolEl().getAttribute("data-centre-pool")).toBe(firstCount);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("powrót do filtra startowego odpytuje Centre jeszcze raz", async () => {
    queryMock.mockImplementation(async (filter: { search?: string }) =>
      makeResult(filter.search ? 12 : 7),
    );
    renderCentre({ initialResult: makeResult(459), queryTimeoutMs: 5000 });
    expect(poolEl().getAttribute("data-centre-pool")).toBe("459");
    await new Promise((r) => setTimeout(r, 280));
    expect(queryMock).not.toHaveBeenCalled();

    const search = screen.getByPlaceholderText(centreUi("pl").search);
    fireEvent.change(search, { target: { value: "Haaland" } });
    await waitFor(() =>
      expect(poolEl().getAttribute("data-centre-pool")).toBe("12"),
    );

    fireEvent.change(search, { target: { value: "" } });
    await waitFor(() =>
      expect(poolEl().getAttribute("data-centre-pool")).toBe("7"),
    );
    const searches = queryMock.mock.calls.map(
      (call) => (call[0] as { search?: string }).search,
    );
    expect(searches).toContain("Haaland");
    expect(searches[searches.length - 1]).toBe("");
  });

  it("zawieszenie wczytania strony na ?tab=centre → błąd, nie wieczne ładowanie", async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => new Promise<StatsCentreResult>(() => undefined));
    const pending = loadCentrePageBoot({
      tab: "centre",
      seasonCode: "2026/27",
      load,
      timeoutMs: 12_000,
    });
    await vi.advanceTimersByTimeAsync(12_000);
    const out = await pending;
    expect(load).toHaveBeenCalledTimes(1);
    expect(out.initialResult).toBeNull();
    expect(out.initialError).toBe(true);
    vi.useRealTimers();
  });

  it("zakładka inna niż centre nie odpala zapytania Centre przy starcie strony", async () => {
    const load = vi.fn();
    const out = await loadCentrePageBoot({
      tab: "studio",
      seasonCode: "2026/27",
      load,
    });
    expect(load).not.toHaveBeenCalled();
    expect(out).toEqual({ initialResult: null, initialError: false });
  });

  it("strona i shell podają wynik startowy do widoku", () => {
    const page = readFileSync(
      path.join(ROOT, "app/admin/(panel)/stats-lab/page.tsx"),
      "utf8",
    );
    const shell = readFileSync(
      path.join(ROOT, "components/admin/stats-lab/StatsLabModuleShell.tsx"),
      "utf8",
    );
    const view = readFileSync(
      path.join(ROOT, "components/admin/stats-lab/StatsCentreView.tsx"),
      "utf8",
    );
    expect(page).toContain("loadCentrePageBoot");
    expect(page).toContain("initialCentreResult={centreBoot.initialResult}");
    expect(page).toContain("initialCentreError={centreBoot.initialError}");
    expect(shell).toContain("initialResult={initialCentreResult}");
    expect(shell).toContain("initialLoadError={initialCentreError}");
    expect(view).toContain("centrePoolPhrase");
    expect(view).toContain('data-centre-table-state="loading"');
    expect(view).not.toMatch(/Pula: \$\{result\?\.totalRows \?\? 0/);
    expect(view).toMatch(
      /}, \[bootstrap\.players\.length, filter, runQuery\]\);/,
    );
  });
});
