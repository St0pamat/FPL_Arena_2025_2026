/** @vitest-environment jsdom */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/stats-lab",
}));

vi.mock("@/app/admin/actions", () => ({
  logoutAction: vi.fn(),
}));

vi.mock("@/components/admin/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Wyloguj</button>,
}));

describe("U6b panel admina poniżej 768 px", () => {
  it("menu jest zwijane, a od 768 px panel zostaje w układzie", async () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, "../../../app/admin/(panel)/layout.tsx"),
      "utf8",
    );
    expect(layout).toContain("flex-col md:flex-row");

    render(<AdminSidebar userEmail="mateusz@example.com" />);
    const toggle = screen.getByRole("button", { name: "Otwórz menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe("admin-sidebar-panel");
    expect(toggle.className).toContain("h-11");
    expect(toggle.className).toContain("w-11");
    expect(toggle.parentElement?.className).toContain("md:hidden");

    const panel = document.getElementById("admin-sidebar-panel");
    expect(panel?.className).toContain("max-md:fixed");
    expect(panel?.className).toContain("md:static");
    expect(panel?.className).toContain("w-64");
    expect(panel?.className).toContain("max-md:-translate-x-full");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Zamknij menu");
    expect(panel?.className).toContain("max-md:translate-x-0");
    await waitFor(() => {
      expect(panel?.contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Otwórz menu");

    fireEvent.click(toggle);
    const backdrop = screen
      .getAllByRole("button", { name: "Zamknij menu" })
      .find((node) => node.className.includes("bg-black/60"));
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("link", { name: /Stats Centre/ }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
