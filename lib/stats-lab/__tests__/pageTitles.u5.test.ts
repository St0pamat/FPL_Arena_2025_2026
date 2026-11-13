import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  parseStatsLabPageTab,
  statsLabPageTitle,
} from "@/lib/stats-lab/i18n";
import { ADMIN_PROJECTS } from "@/lib/admin/navigation";

const ROOT = path.resolve(__dirname, "../../..");

describe("U5 page titles + Sync only in Baza i Synchronizacja", () => {
  it("tytuł zależy od zakładki (PL/EN)", () => {
    expect(statsLabPageTitle("pl", "planner")).toBe("Planer FPL");
    expect(statsLabPageTitle("en", "planner")).toBe("FPL Planner");
    expect(statsLabPageTitle("pl", "centre")).toBe("Stats Centre");
    expect(statsLabPageTitle("en", "centre")).toBe("Stats Centre");
    expect(statsLabPageTitle("pl", "studio")).toBe("Studio wykresów");
    expect(statsLabPageTitle("en", "studio")).toBe("Chart Studio");
    expect(statsLabPageTitle("pl", "projections")).toBe("Predykcje");
    expect(statsLabPageTitle("en", "projections")).toBe("Predictions");
  });

  it("parseStatsLabPageTab mapuje URL tab", () => {
    expect(parseStatsLabPageTab("centre")).toBe("centre");
    expect(parseStatsLabPageTab("planner")).toBe("planner");
    expect(parseStatsLabPageTab("projections")).toBe("projections");
    expect(parseStatsLabPageTab(undefined)).toBe("studio");
    expect(parseStatsLabPageTab("nope")).toBe("studio");
  });

  it("page.tsx / ModuleShell: brak Sync FPL w nagłówku; tytuł z i18n", () => {
    const page = readFileSync(
      path.join(ROOT, "app/admin/(panel)/stats-lab/page.tsx"),
      "utf8",
    );
    const shell = readFileSync(
      path.join(
        ROOT,
        "components/admin/stats-lab/StatsLabModuleShell.tsx",
      ),
      "utf8",
    );
    expect(page).not.toMatch(/Sync FPL/);
    expect(shell).not.toMatch(/Sync FPL/);
    expect(shell).toMatch(/statsLabPageTitle/);
    expect(shell).toMatch(/data-stats-lab-page-title/);
  });

  it("menu Baza i Synchronizacja FPL → /admin/stats-lab/sync", () => {
    const project = ADMIN_PROJECTS.find((p) => p.id === "stats-lab");
    expect(project).toBeTruthy();
    const item = project!.sections
      .flatMap((s) => s.items)
      .find((i) => i.href === "/admin/stats-lab/sync");
    expect(item?.label).toBe("Baza i Synchronizacja FPL");
  });
});
