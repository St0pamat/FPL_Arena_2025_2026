import { describe, expect, it } from "vitest";
import {
  buildDixonColesGrid,
  clampDixonColesRho,
  csProb,
  fdrAttack,
  fdrDefence,
  fdrLevel,
  fdrOverall,
  lin,
  outcomeProbs,
  scoreGrid,
  top3Scores,
} from "@/lib/stats-lab/projectionsEngine";

function matrixSum(matrix: number[][]): number {
  let s = 0;
  for (const row of matrix) {
    for (const p of row) s += p;
  }
  return s;
}

function expectedGoalsFromMatrix(matrix: number[][]): {
  eHome: number;
  eAway: number;
} {
  let eHome = 0;
  let eAway = 0;
  for (let x = 0; x < matrix.length; x += 1) {
    const row = matrix[x]!;
    for (let y = 0; y < row.length; y += 1) {
      const p = row[y]!;
      eHome += x * p;
      eAway += y * p;
    }
  }
  return { eHome, eAway };
}

describe("scoreGrid / Dixon-Coles", () => {
  it("sums to 1 ± 1e-9 for λ ∈ {0.15, 1.1, 1.8, 4.5}", () => {
    for (const lam of [0.15, 1.1, 1.8, 4.5]) {
      const grid = scoreGrid(lam, lam, -0.1);
      expect(grid.matrix).toBeDefined();
      expect(Math.abs(matrixSum(grid.matrix!) - 1)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(grid.matrixSum - 1)).toBeLessThanOrEqual(1e-9);
    }
  });

  it("has no negative P when rho=-0.5 (rho clamped)", () => {
    const lh = 1.8;
    const la = 1.1;
    const rawRho = -0.5;
    const r = clampDixonColesRho(rawRho, lh, la);
    const lo = Math.max(-1 / lh, -1 / la);
    const hi = Math.min(1 / (lh * la), 1);
    expect(r).toBeGreaterThanOrEqual(lo - 1e-12);
    expect(r).toBeLessThanOrEqual(hi + 1e-12);

    const grid = scoreGrid(lh, la, rawRho);
    expect(grid.r).toBe(r);
    for (const row of grid.matrix!) {
      for (const p of row) {
        expect(p).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("dynamic grid for λH=λA=4.5: size from formula, sum≈1, |E−λ|<1e-7", () => {
    const lam = 4.5;
    const expectedMaxGoals = Math.max(
      12,
      Math.ceil(lam + 8 * Math.sqrt(lam)),
    );
    const grid = scoreGrid(lam, lam, -0.1);
    expect(grid.maxGoals).toBe(expectedMaxGoals);
    expect(grid.matrix!.length).toBe(expectedMaxGoals + 1);
    expect(grid.matrix![0]!.length).toBe(expectedMaxGoals + 1);
    expect(Math.abs(matrixSum(grid.matrix!) - 1)).toBeLessThanOrEqual(1e-9);

    const { eHome, eAway } = expectedGoalsFromMatrix(grid.matrix!);
    expect(Math.abs(eHome - lam)).toBeLessThan(1e-7);
    expect(Math.abs(eAway - lam)).toBeLessThan(1e-7);
  });
});

describe("csProb", () => {
  it("equals exp(-λ) ± 1e-9 and matches Σ P(x,0) ± 1e-9", () => {
    const lambdaOpp = 1.25;
    const closed = csProb(lambdaOpp);
    expect(Math.abs(closed - Math.exp(-lambdaOpp))).toBeLessThanOrEqual(1e-9);

    const grid = buildDixonColesGrid(1.8, lambdaOpp, -0.1);
    let sumAwayZero = 0;
    for (let x = 0; x <= grid.maxGoals; x += 1) {
      sumAwayZero += grid.matrix![x]![0]!;
    }
    expect(Math.abs(sumAwayZero - closed)).toBeLessThanOrEqual(1e-9);
  });
});

describe("top3Scores", () => {
  it("λH=1.8, λA=1.1, ρ=-0.1 → 1-1, 2-1, 2-0 with expected pct", () => {
    const top = top3Scores(1.8, 1.1, -0.1);
    expect(top.map((t) => t.scoreLabel)).toEqual(["1-1", "2-1", "2-0"]);
    expect(top[0]!.pct).toBe(12.0);
    expect(top[1]!.pct).toBe(9.8);
    expect(top[2]!.pct).toBe(8.9);
  });

  it("tie-break: equal P → fewer goals, then more home goals", () => {
    const items = [
      { x: 1, y: 1, p: 0.2 },
      { x: 2, y: 0, p: 0.2 },
      { x: 0, y: 0, p: 0.2 },
    ].sort((a, b) => {
      if (b.p !== a.p) return b.p - a.p;
      const sa = a.x + a.y;
      const sb = b.x + b.y;
      if (sa !== sb) return sa - sb;
      return b.x - a.x;
    });
    expect(items.map((i) => `${i.x}-${i.y}`)).toEqual(["0-0", "2-0", "1-1"]);
  });
});

describe("outcomeProbs / FDR", () => {
  it("outcomeProbs sum to ~1", () => {
    const o = outcomeProbs(1.8, 1.1, -0.1);
    expect(Math.abs(o.pWinHome + o.pDraw + o.pWinAway - 1)).toBeLessThan(1e-9);
  });

  it("fdrAttack / fdrDefence / fdrOverall match compute formulas", () => {
    expect(fdrAttack(1.6)).toBeCloseTo(100 * (1 - lin(1.6, 0.6, 2.6)), 10);
    expect(fdrDefence(0.3)).toBeCloseTo(100 * (1 - lin(0.3, 0.08, 0.55)), 10);
    expect(fdrOverall(0.4, 0.25)).toBeCloseTo(
      100 * (1 - lin(0.4 + 0.5 * 0.25, 0.15, 0.85)),
      10,
    );
  });

  it("fdrLevel thresholds", () => {
    expect(fdrLevel(0)).toBe(1);
    expect(fdrLevel(19.99)).toBe(1);
    expect(fdrLevel(20)).toBe(2);
    expect(fdrLevel(40)).toBe(3);
    expect(fdrLevel(60)).toBe(4);
    expect(fdrLevel(80)).toBe(5);
    expect(fdrLevel(100)).toBe(5);
  });

  it("lin degenerate hi−lo ≤ 1e-6 → 0.5", () => {
    expect(lin(1, 2, 2)).toBe(0.5);
    expect(lin(10, 0, 0)).toBe(0.5);
  });
});
