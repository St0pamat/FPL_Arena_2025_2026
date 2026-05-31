#!/usr/bin/env python3
"""Extract src/ modules from Skarb kibica - wyjsciowa.html (line-based, preserves logic)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "Skarb kibica - wyjsciowa.html"
SRC = ROOT / "src"


def read_lines() -> list[str]:
    return HTML.read_text(encoding="utf-8").splitlines()


def find_line(lines: list[str], pattern: str) -> int:
    for i, line in enumerate(lines):
        if pattern in line:
            return i
    raise SystemExit(f"Pattern not found: {pattern}")


def slice_body(lines: list[str], start: int, end: int) -> str:
    """Extract lines [start, end) and dedent 8 spaces."""
    chunk = lines[start:end]
    out = []
    for line in chunk:
        if line.startswith("        "):
            out.append(line[8:])
        elif line.strip() == "":
            out.append("")
        else:
            out.append(line)
    return "\n".join(out).rstrip()


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")
    print(f"  {path.relative_to(ROOT)}")


def main() -> None:
    lines = read_lines()

    # CSS: lines 14-260 (inside <style>)
    style_start = find_line(lines, "<style>") + 1
    style_end = find_line(lines, "</style>")
    write(SRC / "styles" / "global.css", "\n".join(lines[style_start:style_end]))

    # Babel script boundaries
    script_start = find_line(lines, '<script type="text/babel">') + 1
    script_end = find_line(lines, "</script>")

    players_start = find_line(lines, "const PLAYERS_DATA = [")
    players_end = find_line(lines, "        ];") + 1
    players_body = slice_body(lines, players_start, players_end)
    write(
        SRC / "data" / "players.ts",
        'import type { Player } from "@/types/player";\n\n'
        f"export const PLAYERS_DATA: Player[] = {players_body.removeprefix('const PLAYERS_DATA = ')};\n",
    )

    ranges = {
        "lib/match.ts": ("const getMatchOutcome", "const LOGO_BASE"),
        "config/branding.ts": ("const LOGO_BASE", "const formatOrDisplay"),
        "features/profiles/lib/or.ts": ("const formatOrDisplay", "const ProfileExpectationsPanel"),
        "features/profiles/lib/profileStory.ts": ("const buildProfileSeasonStory", "const ProfileExpectationsPanel"),
        "features/profiles/components/ProfileExpectationsPanel.tsx": (
            "const ProfileExpectationsPanel",
            "const CREST_SIZES",
        ),
        "components/branding/index.tsx": ("const CREST_SIZES", "const FPL_BOOTSTRAP_URL"),
        "components/ui/index.tsx": ("const StatPill", "const FPL_BOOTSTRAP_URL"),
        "services/fpl/api.ts": ("const FPL_BOOTSTRAP_URL", "const PITCH_SLOT_WIDTH"),
        "features/pitch/components/TeamOfSeasonPitch.tsx": (
            "const PITCH_SLOT_WIDTH",
            "const SeasonHighlightsPanel",
        ),
        "features/profiles/components/SeasonHighlightsPanel.tsx": (
            "const SeasonHighlightsPanel",
            "const HomeNavButton",
        ),
        "features/home/components/HomeNavButton.tsx": ("const HomeNavButton", "const WynikiView"),
        "features/wyniki/WynikiView.tsx": ("const WynikiView", "const emptyStandingRow"),
        "features/standings/lib/standings.ts": ("const emptyStandingRow", "const RankChangeBadge"),
        "features/standings/components/RankChangeBadge.tsx": (
            "const RankChangeBadge",
            "const StandingsView",
        ),
        "features/standings/StandingsView.tsx": ("const StandingsView", "const HallFameCard"),
        "features/hall/lib/awards.ts": ("const buildExtraHallAwards", "const HallFameCard"),
        "features/hall/components/HallFameCard.tsx": ("const HallFameCard", "const HallOfFameView"),
        "features/hall/HallOfFameView.tsx": ("const HallOfFameView", "function App()"),
        "app/App.tsx": ("function App()", "const root = ReactDOM"),
    }

    # or.ts includes everything from formatOrDisplay through buildProfileSeasonStory (exclusive panel)
    ranges["features/profiles/lib/or.ts"] = (
        "const formatOrDisplay",
        "const buildProfileSeasonStory",
    )

    # profileStory is only buildProfileSeasonStory function
    # branding: CREST through EVENT - split StatPill separately
    ranges["components/branding/index.tsx"] = ("const CREST_SIZES", "const StatPill")
    ranges["components/ui/index.tsx"] = ("const StatPill", "const FPL_BOOTSTRAP_URL")

    # fpl constants from EVENT_TYPE through before FPL_BOOTSTRAP - actually EVENT is before StatPill
    # Re-read order: CREST, League, TeamBrand, EVENT, POSITION, H2H, StatPill, Insight, FPL_BOOTSTRAP
    ranges["features/fpl/constants.ts"] = ("const EVENT_TYPE_LABELS", "const StatPill")
    ranges["components/branding/index.tsx"] = ("const CREST_SIZES", "const EVENT_TYPE_LABELS")

    abs_ranges: dict[str, tuple[int, int]] = {}
    for rel, (start_pat, end_pat) in ranges.items():
        s = find_line(lines, start_pat)
        e = find_line(lines, end_pat)
        abs_ranges[rel] = (s, e)

    for rel, (s, e) in abs_ranges.items():
        body = slice_body(lines, s, e)
        write(SRC / rel, body)

    print("Extracted", len(abs_ranges), "modules. Post-process imports with scripts/add-imports.py")

if __name__ == "__main__":
    main()
