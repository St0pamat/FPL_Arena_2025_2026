import { describe, expect, it } from "vitest";
import {
  PERIOD_LABELS,
  POINTS_NEG_LABELS,
  POINTS_NEG_SHORT,
  POINTS_POS_LABELS,
  POINTS_POS_SHORT,
  STATS_LAB_SHELL_LABELS,
  STATS_LAB_SHELL_TOOLTIPS,
  STREAK_LABELS,
  STREAK_SORT_SHORT_LABELS,
  UI_COPY,
  VIZ_MODE_LABELS,
} from "@/lib/stats-lab/i18n";
import {
  PLANNER_CHIP_OFFICIAL_NAMES,
  PLANNER_LABELS,
  PLANNER_TOOLTIPS,
  formatPlannerTemplate,
  formatSignedTenthsAsPounds,
  formatTenthsAbsValue,
  plannerChipOfficialName,
  plannerChipShort,
  pt,
  ptTip,
  resolvePlannerWarning,
  type PlannerTooltipKey,
  type PlannerWarning,
  type PlannerWarningKey,
} from "@/lib/stats-lab/plannerI18n";
import {
  formatOverLimitClubList,
} from "@/lib/stats-lab/fplEntryApi";
import { buildPlannerDraftSummary } from "@/lib/stats-lab/plannerEngine";
import {
  PROJECTIONS_CELL_LAYOUT_LABELS,
  PROJECTIONS_CELL_METRIC_LABELS,
  PROJECTIONS_CS_BAND_LABELS,
  PROJECTIONS_DGW_CS_MODE_LABELS,
  PROJECTIONS_FDR_LEVEL_LABELS,
  PROJECTIONS_FDR_MODE_LABELS,
  PROJECTIONS_FDR_NUMBER_FORMAT_LABELS,
  PROJECTIONS_GOALS_BAND_LABELS,
  PROJECTIONS_MATCHUP_MODE_LABELS,
  PROJECTIONS_MATCHUP_SORT_LABELS,
  PROJECTIONS_MODULE_LABEL,
  PROJECTIONS_POSTER_EYEBROW,
  PROJECTIONS_RANGE_PRESETS,
  PROJECTIONS_SUBVIEW_LABELS,
  PROJECTIONS_VENUE_FILTER_LABELS,
  projectionsUi,
} from "@/lib/stats-lab/projectionsI18n";

type Dict = Record<string, unknown>;

function isPlainObject(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Flatten nested string leaves to `a.b.c` paths. */
function flattenStringLeaves(
  value: unknown,
  prefix = "",
): Record<string, string> {
  if (typeof value === "string") {
    return prefix ? { [prefix]: value } : {};
  }
  if (!isPlainObject(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    Object.assign(out, flattenStringLeaves(child, path));
  }
  return out;
}

function compareLangLeaves(
  name: string,
  plRoot: unknown,
  enRoot: unknown,
): string[] {
  const pl = flattenStringLeaves(plRoot);
  const en = flattenStringLeaves(enRoot);
  const issues: string[] = [];

  for (const key of Object.keys(pl)) {
    if (!(key in en)) {
      issues.push(`[${name}] missing in EN: ${key}`);
    } else if (!String(en[key] ?? "").trim()) {
      issues.push(`[${name}] empty EN: ${key}`);
    }
    if (!String(pl[key] ?? "").trim()) {
      issues.push(`[${name}] empty PL: ${key}`);
    }
  }
  for (const key of Object.keys(en)) {
    if (!(key in pl)) {
      issues.push(`[${name}] missing in PL: ${key}`);
    }
  }
  return issues;
}

function compareDualLangRecord(
  name: string,
  dict: { pl: unknown; en: unknown },
): string[] {
  return compareLangLeaves(name, dict.pl, dict.en);
}

describe("i18n PL/EN key parity", () => {
  it("has matching non-empty keys for Stats Lab / Planner / Projections dictionaries", () => {
    const issues: string[] = [];

    issues.push(...compareDualLangRecord("i18n.UI_COPY", UI_COPY));
    issues.push(...compareDualLangRecord("i18n.PERIOD_LABELS", PERIOD_LABELS));
    issues.push(...compareDualLangRecord("i18n.VIZ_MODE_LABELS", VIZ_MODE_LABELS));
    issues.push(...compareDualLangRecord("i18n.STREAK_LABELS", STREAK_LABELS));
    issues.push(
      ...compareDualLangRecord(
        "i18n.STREAK_SORT_SHORT_LABELS",
        STREAK_SORT_SHORT_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord("i18n.POINTS_POS_LABELS", POINTS_POS_LABELS),
    );
    issues.push(
      ...compareDualLangRecord("i18n.POINTS_POS_SHORT", POINTS_POS_SHORT),
    );
    issues.push(
      ...compareDualLangRecord("i18n.POINTS_NEG_SHORT", POINTS_NEG_SHORT),
    );
    issues.push(
      ...compareDualLangRecord("i18n.POINTS_NEG_LABELS", POINTS_NEG_LABELS),
    );

    issues.push(
      ...compareDualLangRecord(
        "i18n.STATS_LAB_SHELL_LABELS",
        STATS_LAB_SHELL_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "i18n.STATS_LAB_SHELL_TOOLTIPS",
        STATS_LAB_SHELL_TOOLTIPS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "plannerI18n.PLANNER_LABELS",
        PLANNER_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "plannerI18n.PLANNER_TOOLTIPS",
        PLANNER_TOOLTIPS,
      ),
    );

    issues.push(
      ...compareDualLangRecord("projectionsI18n.PROJECTIONS_MODULE_LABEL", {
        pl: PROJECTIONS_MODULE_LABEL.pl,
        en: PROJECTIONS_MODULE_LABEL.en,
      }),
    );
    issues.push(
      ...compareDualLangRecord("projectionsI18n.PROJECTIONS_POSTER_EYEBROW", {
        pl: PROJECTIONS_POSTER_EYEBROW.pl,
        en: PROJECTIONS_POSTER_EYEBROW.en,
      }),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_SUBVIEW_LABELS",
        PROJECTIONS_SUBVIEW_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_FDR_MODE_LABELS",
        PROJECTIONS_FDR_MODE_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_CELL_METRIC_LABELS",
        PROJECTIONS_CELL_METRIC_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_VENUE_FILTER_LABELS",
        PROJECTIONS_VENUE_FILTER_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_CELL_LAYOUT_LABELS",
        PROJECTIONS_CELL_LAYOUT_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_FDR_NUMBER_FORMAT_LABELS",
        PROJECTIONS_FDR_NUMBER_FORMAT_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_DGW_CS_MODE_LABELS",
        PROJECTIONS_DGW_CS_MODE_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_RANGE_PRESETS",
        PROJECTIONS_RANGE_PRESETS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_FDR_LEVEL_LABELS",
        PROJECTIONS_FDR_LEVEL_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_GOALS_BAND_LABELS",
        PROJECTIONS_GOALS_BAND_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_CS_BAND_LABELS",
        PROJECTIONS_CS_BAND_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_MATCHUP_MODE_LABELS",
        PROJECTIONS_MATCHUP_MODE_LABELS,
      ),
    );
    issues.push(
      ...compareDualLangRecord(
        "projectionsI18n.PROJECTIONS_MATCHUP_SORT_LABELS",
        PROJECTIONS_MATCHUP_SORT_LABELS,
      ),
    );
    issues.push(
      ...compareLangLeaves(
        "projectionsI18n.projectionsUi",
        projectionsUi("pl"),
        projectionsUi("en"),
      ),
    );

    if (issues.length > 0) {
      console.error(
        `[i18n-parity] ${issues.length} issue(s):\n${issues.join("\n")}`,
      );
    }

    expect(issues, issues.join("\n")).toEqual([]);
  });

  it("EN labels and tooltips contain no Polish diacritics", () => {
    const polish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    const issues: string[] = [];
    const scan = (name: string, dict: Record<string, string>) => {
      for (const [key, value] of Object.entries(dict)) {
        if (polish.test(value)) {
          issues.push(`[${name}] Polish char in EN ${key}: ${value}`);
        }
      }
    };
    scan("PLANNER_LABELS.en", PLANNER_LABELS.en as Record<string, string>);
    scan("PLANNER_TOOLTIPS.en", PLANNER_TOOLTIPS.en as Record<string, string>);
    scan(
      "STATS_LAB_SHELL_LABELS.en",
      STATS_LAB_SHELL_LABELS.en as Record<string, string>,
    );
    scan(
      "STATS_LAB_SHELL_TOOLTIPS.en",
      STATS_LAB_SHELL_TOOLTIPS.en as Record<string, string>,
    );
    expect(issues, issues.join("\n")).toEqual([]);
  });

  it("planner labels never use bare PP/CP/SP except *.short with full tooltip", () => {
    const bare = /^(PP|CP|SP)$/;
    const issues: string[] = [];
    for (const lang of ["pl", "en"] as const) {
      const labels = PLANNER_LABELS[lang] as Record<string, string>;
      for (const [key, value] of Object.entries(labels)) {
        const trimmed = value.trim();
        if (!bare.test(trimmed)) {
          // Non-short: abbreviation only inside parentheses after a full name
          if (
            !key.endsWith(".short") &&
            /\b(PP|CP|SP)\b/.test(trimmed) &&
            !/\([^)]*\b(PP|CP|SP)\b[^)]*\)/.test(trimmed)
          ) {
            issues.push(
              `[${lang}] non-.short bare abbr outside parens: ${key}=${value}`,
            );
          }
          continue;
        }
        if (!key.endsWith(".short")) {
          issues.push(`[${lang}] bare ${trimmed} but key not .short: ${key}`);
          continue;
        }
        const tipKey = key as PlannerTooltipKey;
        const tip =
          tipKey in PLANNER_TOOLTIPS[lang]
            ? PLANNER_TOOLTIPS[lang][tipKey as keyof (typeof PLANNER_TOOLTIPS)["pl"]]
            : "";
        const need =
          trimmed === "PP"
            ? /(Purchase price \(PP\)|Cena zakupu \(PP\))/
            : trimmed === "CP"
              ? /(Current price \(CP\)|Cena teraz \(CP\))/
              : /(Selling price \(SP\)|Cena sprzedaży \(SP\))/;
        if (!need.test(tip)) {
          issues.push(
            `[${lang}] ${key}=${trimmed} tooltip missing full name: ${tip}`,
          );
        }
      }
    }
    expect(issues, issues.join("\n")).toEqual([]);
  });
});

describe("planner i18n templates (A2)", () => {
  it("interpolates {gw}/{from}/{to} without leaving raw placeholders", () => {
    for (const lang of ["pl", "en"] as const) {
      const next = pt(lang, "planner.xpts.nextGw", { gw: 12 });
      const horizon = pt(lang, "planner.xpts.horizonSum", {
        from: 12,
        to: 18,
      });
      expect(next).not.toMatch(/\{gw\}/);
      expect(horizon).not.toMatch(/\{from\}|\{to\}/);
      expect(next).toContain("12");
      expect(horizon).toContain("12");
      expect(horizon).toContain("18");
    }
  });

  it("resolves captain / vice BGW warnings from keys (no hardcoded EN)", () => {
    const captainPl = resolvePlannerWarning(
      { key: "planner.captain.noFixture" },
      "pl",
    );
    const captainEn = resolvePlannerWarning(
      { key: "planner.captain.noFixture" },
      "en",
    );
    const vicePl = resolvePlannerWarning(
      { key: "planner.vice.noFixture" },
      "pl",
    );
    const viceEn = resolvePlannerWarning(
      { key: "planner.vice.noFixture" },
      "en",
    );
    expect(captainPl).toBe("Kapitan nie gra w tej kolejce");
    expect(captainEn).toBe("Your captain has no match this gameweek");
    expect(vicePl).toBe("Wicekapitan nie gra w tej kolejce");
    expect(viceEn).toBe(
      "Your vice-captain has no match this gameweek",
    );
    expect(captainEn).not.toBe("Captain has BGW.");
    expect(viceEn).not.toBe("Vice-captain has BGW.");
  });

  it("formatPlannerTemplate leaves unknown tokens intact", () => {
    expect(formatPlannerTemplate("GW{gw} / {missing}", { gw: 3 })).toBe(
      "GW3 / {missing}",
    );
  });

  it("chip warnings use official English names via plannerChipOfficialName", () => {
    expect(plannerChipOfficialName("wildcard")).toBe("Wildcard");
    expect(plannerChipOfficialName("freehit")).toBe("Free Hit");
    expect(plannerChipOfficialName("bboost")).toBe("Bench Boost");
    expect(plannerChipOfficialName("3xc")).toBe("Triple Captain");
    expect(PLANNER_CHIP_OFFICIAL_NAMES.wildcard).toBe("Wildcard");

    const cases = [
      { chip: "wildcard" as const, name: "Wildcard" },
      { chip: "freehit" as const, name: "Free Hit" },
      { chip: "bboost" as const, name: "Bench Boost" },
      { chip: "3xc" as const, name: "Triple Captain" },
    ];
    for (const { chip, name } of cases) {
      for (const lang of ["pl", "en"] as const) {
        const text = resolvePlannerWarning(
          {
            key: "planner.chip.alreadyPlanned",
            params: { chip, gw: 12 },
          },
          lang,
        );
        expect(text).toContain(name);
        expect(text).not.toMatch(/\b(wildcard|freehit|bboost|3xc)\b/);
        expect(text).not.toMatch(/\b(WC|FH|BB|TC)\b/);
      }
    }
  });

  it("planner.hit.brutto interpolates {value}", () => {
    expect(pt("pl", "planner.hit.brutto", { value: "12.3" })).toBe(
      "brutto 12.3",
    );
    expect(pt("en", "planner.hit.brutto", { value: "12.3" })).toBe(
      "gross 12.3",
    );
  });

  it("Mateusz decisions: Pick best XI / Multi-gameweek plan / Selling price (SP)", () => {
    expect(pt("en", "planner.action.optimise")).toBe("Pick best XI");
    expect(pt("en", "planner.horizon.title")).toBe("Multi-gameweek plan");
    expect(pt("en", "planner.price.selling")).toBe("Selling price (SP)");
  });

  it("planner.ft.nextGw includes {gw} (PL/EN); outside horizon ftNextGw is null without empty GW", () => {
    expect(pt("pl", "planner.ft.nextGw", { gw: 14 })).toBe(
      "FT na tę kolejkę (GW14)",
    );
    expect(pt("en", "planner.ft.nextGw", { gw: 14 })).toBe(
      "FT this gameweek (GW14)",
    );
    expect(PLANNER_LABELS.pl["planner.ft.nextGw"]).toContain("{gw}");
    expect(PLANNER_LABELS.en["planner.ft.nextGw"]).toContain("{gw}");
    const outside = buildPlannerDraftSummary({
      variant: "A",
      gws: [],
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });
    expect(outside.ftNextGw).toBeNull();
    expect(outside.xPtsNextGw).toBeNull();
  });

  it("PL and EN key sets are identical for labels and tooltips", () => {
    expect(Object.keys(PLANNER_LABELS.pl).sort()).toEqual(
      Object.keys(PLANNER_LABELS.en).sort(),
    );
    expect(Object.keys(PLANNER_TOOLTIPS.pl).sort()).toEqual(
      Object.keys(PLANNER_TOOLTIPS.en).sort(),
    );
    expect(Object.keys(STATS_LAB_SHELL_LABELS.pl).sort()).toEqual(
      Object.keys(STATS_LAB_SHELL_LABELS.en).sort(),
    );
    expect(Object.keys(STATS_LAB_SHELL_TOOLTIPS.pl).sort()).toEqual(
      Object.keys(STATS_LAB_SHELL_TOOLTIPS.en).sort(),
    );
  });

  it("all five planner.entry.* warnings resolve without raw {param}", () => {
    const cases: Array<{
      key: PlannerWarningKey;
      params: Record<string, string | number>;
    }> = [
      {
        key: "planner.entry.freeHitRollback",
        params: { gw: 12, prev: 11 },
      },
      { key: "planner.entry.priceApprox", params: { elementId: 1 } },
      { key: "planner.entry.squadSize", params: { n: 14 } },
      { key: "planner.entry.clubLimit", params: { list: "ARS, LIV" } },
      {
        key: "planner.entry.valueDelta",
        params: { value: formatSignedTenthsAsPounds(3) },
      },
    ];
    for (const { key, params } of cases) {
      for (const lang of ["pl", "en"] as const) {
        const text = resolvePlannerWarning({ key, params }, lang);
        expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(text.length).toBeGreaterThan(5);
      }
    }
  });

  it("valueDelta signs: +£0.3m / −£0.2m / £0.0m; tiny delta never −£0.0m", () => {
    expect(formatSignedTenthsAsPounds(3)).toBe("+£0.3m");
    expect(formatSignedTenthsAsPounds(-2)).toBe("−£0.2m");
    expect(formatSignedTenthsAsPounds(0)).toBe("£0.0m");
    expect(formatSignedTenthsAsPounds(-0.4)).toBe("£0.0m");
    expect(formatSignedTenthsAsPounds(0.4)).toBe("£0.0m");
    expect(formatSignedTenthsAsPounds(-0.4)).not.toBe("−£0.0m");
  });

  it("clubLimit list is ARS, LIV (no brackets/JSON); single club ARS", () => {
    const shortById = new Map([
      [1, "ARS"],
      [2, "LIV"],
    ]);
    expect(formatOverLimitClubList([1, 2], shortById)).toBe("ARS, LIV");
    expect(formatOverLimitClubList([1], shortById)).toBe("ARS");
    for (const lang of ["pl", "en"] as const) {
      const text = resolvePlannerWarning(
        {
          key: "planner.entry.clubLimit",
          params: { list: formatOverLimitClubList([1, 2], shortById) },
        },
        lang,
      );
      expect(text).toContain("ARS, LIV");
      expect(text).not.toMatch(/\[|\]|\{|\}/);
    }
  });

  it("exportPair-style warning mapping yields finished sentences in PL and EN", () => {
    const warnings: PlannerWarning[] = [
      {
        key: "planner.entry.freeHitRollback",
        params: { gw: 12, prev: 11 },
      },
      { key: "planner.entry.priceApprox" },
      { key: "planner.entry.squadSize", params: { n: 14 } },
      { key: "planner.entry.clubLimit", params: { list: "ARS" } },
      {
        key: "planner.entry.valueDelta",
        params: { value: formatSignedTenthsAsPounds(-2) },
      },
      { key: "planner.captain.noFixture" },
    ];
    for (const lang of ["pl", "en"] as const) {
      const exported = warnings.map((w) => resolvePlannerWarning(w, lang));
      for (const text of exported) {
        expect(text).not.toMatch(/planner\./);
        expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(text.length).toBeGreaterThan(5);
      }
    }
  });

  it("single Suma xPts key: planner.xpts.horizonSum only (no horizon.sumXpts)", () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        PLANNER_LABELS.pl,
        "planner.horizon.sumXpts",
      ),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        PLANNER_LABELS.en,
        "planner.horizon.sumXpts",
      ),
    ).toBe(false);
    expect(pt("pl", "planner.xpts.horizonSum", { from: 1, to: 3 })).toContain(
      "Suma xPts",
    );
    expect(pt("en", "planner.xpts.horizonSum", { from: 1, to: 3 })).toContain(
      "xPts total",
    );
  });

  it("maxPrice formats 75 tenths as £7.5m (never 75)", () => {
    const n = formatTenthsAbsValue(75);
    expect(n).toBe("7.5");
    expect(pt("pl", "planner.market.maxPrice", { n })).toBe("≤ £7.5m");
    expect(pt("en", "planner.market.maxPrice", { n })).toBe("≤ £7.5m");
    expect(pt("pl", "planner.market.maxPrice", { n })).not.toContain("£75");
  });

  it("02c tooltips: TSB% and lockedProfit", () => {
    expect(ptTip("pl", "planner.market.sort.tsb")).toBe(
      "Wybrany przez % menedżerów (TSB)",
    );
    expect(ptTip("en", "planner.market.sort.tsb")).toBe(
      "Selected by % of managers (TSB)",
    );
    expect(ptTip("pl", "planner.horizon.lockedProfit")).toContain(
      "połowę wzrostu ceny",
    );
    expect(ptTip("en", "planner.horizon.lockedProfit")).toContain(
      "half of the price rise",
    );
  });

  it("unknown FPL chip id shows raw string without undefined", () => {
    const raw = "mystery_chip_99";
    expect(plannerChipOfficialName(raw)).toBe(raw);
    expect(plannerChipShort(raw)).toBe(raw);
    expect(plannerChipOfficialName(raw)).not.toContain("undefined");
    expect(plannerChipShort("")).toBe("");
    const text = resolvePlannerWarning(
      {
        key: "planner.chip.alreadyPlanned",
        params: { chip: raw, gw: 7 },
      },
      "en",
    );
    expect(text).toContain(raw);
    expect(text).not.toContain("undefined");
  });
});
