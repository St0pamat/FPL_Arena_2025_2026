/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import {
  SHELL_NAV_TAB_IDS,
  shellNavActiveClass,
  shellNavTabClass,
  type ShellNavTabId,
} from "@/lib/stats-lab/shellNavChrome";
import { STATS_LAB_THEME_HEX } from "@/lib/stats-lab/themeTokens";

const THEMES: StatsLabChartThemeId[] = [
  "ARENA_DARK",
  "SCOUT_DARK",
  "ANALYST_LIGHT",
];

function MiniNav({
  active,
  themeId,
}: {
  active: ShellNavTabId;
  themeId: StatsLabChartThemeId;
}) {
  return (
    <div data-testid="mini-nav">
      {SHELL_NAV_TAB_IDS.map((id) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            data-stats-lab-nav-tab={id}
            data-active={isActive ? "true" : "false"}
            aria-current={isActive ? "page" : undefined}
            className={shellNavTabClass(isActive, themeId)}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}

describe("U4 shell nav — one active tab + one accent", () => {
  it("active class contains theme accent hex; inactive does not", () => {
    for (const themeId of THEMES) {
      const accent = STATS_LAB_THEME_HEX[themeId].accent;
      const active = shellNavActiveClass(themeId);
      expect(active.toLowerCase()).toContain(accent.toLowerCase());
      expect(shellNavTabClass(false, themeId).toLowerCase()).not.toContain(
        accent.toLowerCase(),
      );
    }
  });

  it("Scout active ≠ Arena neon #39FF14", () => {
    expect(shellNavActiveClass("SCOUT_DARK").toLowerCase()).not.toContain(
      "39ff14",
    );
    expect(shellNavActiveClass("SCOUT_DARK")).toContain("2dd4bf");
    expect(shellNavActiveClass("ARENA_DARK")).toContain("39FF14");
  });

  it("górna nawigacja: tylko jedna zakładka ma stan aktywny", () => {
    for (const themeId of THEMES) {
      for (const active of SHELL_NAV_TAB_IDS) {
        const { unmount } = render(
          <MiniNav active={active} themeId={themeId} />,
        );
        const actives = screen
          .getAllByRole("button")
          .filter((b) => b.getAttribute("data-active") === "true");
        expect(actives).toHaveLength(1);
        expect(actives[0]!.getAttribute("data-stats-lab-nav-tab")).toBe(
          active,
        );
        expect(actives[0]!.getAttribute("aria-current")).toBe("page");
        const inactives = screen
          .getAllByRole("button")
          .filter((b) => b.getAttribute("data-active") === "false");
        expect(inactives).toHaveLength(SHELL_NAV_TAB_IDS.length - 1);
        unmount();
      }
    }
  });
});
