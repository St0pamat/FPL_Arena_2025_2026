import { expect, test } from "@playwright/test";
import path from "node:path";

test.describe("Stats Lab Planner smoke", () => {
  test("renders planner tab from ?tab=planner", async ({ page }, testInfo) => {
    await page.goto("/admin/stats-lab?tab=planner");

    const plannerTab = page.getByRole("button", {
      name: /Planer FPL|FPL Planner/i,
    });
    await expect(plannerTab).toBeVisible();

    const plannerPanel = page.locator('[aria-hidden="false"]').filter({
      hasText: /Planer|Planner|Skład Demo|Demo Squad|ID drużyny|Team ID/i,
    });
    await expect(plannerPanel.first()).toBeVisible({ timeout: 30_000 });

    const shotDir = path.join("tests", "screenshots", testInfo.project.name);
    await page.screenshot({
      path: path.join(shotDir, "planner-smoke.png"),
      fullPage: true,
    });
  });
});
