/** @vitest-environment jsdom */
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricNameToggle } from "@/components/admin/stats-lab/MetricNameMode";
import {
  METRIC_NAME_STORAGE_KEY,
  centreHeaderFace,
  metricChipLabel,
  readMetricNameMode,
  writeMetricNameMode,
} from "@/lib/stats-lab/metricNameMode";
import { getFplStatDefinition } from "@/lib/stats-lab/types";

describe("U12 przełącznik nazw kryteriów", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opisowe zostawia pełną nazwę, skróty dają oficjalne tokeny", () => {
    const points = getFplStatDefinition("total_points");
    expect(metricChipLabel("total_points", "pl", "descriptive")).toBe(
      points?.labelPl,
    );
    expect(metricChipLabel("total_points", "pl", "descriptive")).toBe(
      "Punkty FPL",
    );
    expect(metricChipLabel("total_points", "en", "abbrev")).toBe("Pts");
    expect(metricChipLabel("goals_scored", "pl", "abbrev")).toBe("G");
    expect(metricChipLabel("defensive_contributions_total", "en", "abbrev")).toBe(
      "DEFCON",
    );
    expect(metricChipLabel("dc_bonus_points", "pl", "abbrev")).toBe("DC");
    expect(centreHeaderFace("total_points", "en", "abbrev").text).toBe("Pts");
    expect(centreHeaderFace("total_points", "en", "abbrev").title).toContain(
      "point",
    );
  });

  it("zapisuje wybór w localStorage i przełącznik go ustawia", async () => {
    writeMetricNameMode("abbrev");
    expect(readMetricNameMode()).toBe("abbrev");
    expect(localStorage.getItem(METRIC_NAME_STORAGE_KEY)).toBe("abbrev");
    localStorage.clear();

    const user = userEvent.setup();
    render(<MetricNameToggle lang="pl" themeId="ARENA_DARK" />);
    const short = screen.getByRole("button", { name: "Skróty" });
    const full = screen.getByRole("button", { name: "Opisowe" });
    expect(full.getAttribute("aria-pressed")).toBe("true");
    await user.click(short);
    expect(short.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(METRIC_NAME_STORAGE_KEY)).toBe("abbrev");
  });
});
