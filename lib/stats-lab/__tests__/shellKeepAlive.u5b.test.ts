import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

describe("U5b Keep-Alive: tytuł/tab nie kasuje Studio", () => {
  it("ModuleShell: visitedTabs + hidden (nie unmount); Studio bez key remount", () => {
    const shell = readFileSync(
      path.join(
        ROOT,
        "components/admin/stats-lab/StatsLabModuleShell.tsx",
      ),
      "utf8",
    );
    expect(shell).toMatch(/visitedTabs\.has\("studio"\)/);
    expect(shell).toMatch(/tab === "studio" \? undefined : "hidden"/);
    expect(shell).toMatch(/statsLabPageTitle\(lang, tab\)/);
    // brak key={tab} / key={lang} na StatsLabStudioClient
    expect(shell).not.toMatch(
      /<StatsLabStudioClient[^>]*key=\{(?:tab|lang)/,
    );
    expect(shell).toMatch(/initialFilter=\{initialFilter\}/);
  });

  it("Heatmap: siatka 280px / 1fr / 112px i filar Oceny zostają", () => {
    const src = readFileSync(
      path.join(
        ROOT,
        "components/admin/stats-lab/charts/HeatmapMatrixChart.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(
      /280px repeat\(\$\{Math\.max\(metrics\.length, 1\)\}, minmax\(0, 1fr\)\) 112px/,
    );
    expect(src).toMatch(/renderCompositeCell/);
    expect(src).toMatch(/data-heatmap-ranking-header/);
    expect(src).toMatch(/data-heatmap-rank-primary/);
    expect(src).toMatch(/data-heatmap-rating-cell/);
  });
});
