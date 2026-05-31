#!/usr/bin/env python3
"""Prepend import blocks to extracted modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

HEADERS: dict[str, str] = {
    "lib/match.ts": '''import type { MatchOutcome } from "@/types/match";

''',
    "features/profiles/lib/or.ts": '''import type { Player } from "@/types/player";
import type { PlayerHighlights } from "@/types/highlights";
import type { GladiatorOrMap } from "@/types/or";

export interface OrBundle {
  historicalOr: number | null;
  historicalOrSeason: string | null;
  seasonOr: number | null;
}

export interface PredictedStandingEntry {
  id: number;
  team: string;
  actualRank: number;
  historicalOr: number | null;
  historicalOrSeason: string | null;
  predictedRank: number | null;
  isDebut?: boolean;
}

''',
    "features/profiles/lib/profileStory.ts": '''import type { Player } from "@/types/player";
import type { PlayerHighlights } from "@/types/highlights";
import type { OrBundle } from "@/features/profiles/lib/or";
import type { PredictedStandingEntry } from "@/features/profiles/lib/or";
import { formatOrDisplay, orTierLabel } from "@/features/profiles/lib/or";

''',
    "features/profiles/components/ProfileExpectationsPanel.tsx": '''import { useMemo } from "react";
import type { Player } from "@/types/player";
import type { PlayerHighlights } from "@/types/highlights";
import type { OrBundle, PredictedStandingEntry } from "@/features/profiles/lib/or";
import { buildProfileSeasonStory } from "@/features/profiles/lib/profileStory";
import { formatOrDisplay } from "@/features/profiles/lib/or";

''',
    "components/branding/index.tsx": '''import { LOGO_BASE, LEAGUE_LOGO_SRC, teamLogoSrc } from "@/config/branding";
import type { Player } from "@/types/player";

''',
    "components/ui/index.tsx": '''import type { ReactNode } from "react";

''',
    "features/fpl/constants.ts": "",  # no imports
    "services/fpl/api.ts": '''import type { DreamTeamPlayer } from "@/types/highlights";
import type { FplElementMap } from "@/types/fpl";

''',
    "features/pitch/components/TeamOfSeasonPitch.tsx": '''import { useState } from "react";
import type { DreamTeamPlayer } from "@/types/highlights";
import type { FplElementMap } from "@/types/fpl";
import {
  FPL_PHOTO_SIZES,
  getPlayerPhotoUrl,
  groupPlayersByPosition,
  inferFormation,
  mapDreamTeamPlayer,
} from "@/services/fpl/api";

''',
    "features/profiles/components/SeasonHighlightsPanel.tsx": '''import { useMemo } from "react";
import type { PlayerHighlights } from "@/types/highlights";
import type { FplElementMap } from "@/types/fpl";
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, POSITION_COLORS } from "@/features/fpl/constants";
import { StatPill, InsightCard } from "@/components/ui";
import { TeamOfSeasonPitch } from "@/features/pitch/components/TeamOfSeasonPitch";

''',
    "features/home/components/HomeNavButton.tsx": '''import type { ReactNode } from "react";

''',
    "features/wyniki/WynikiView.tsx": '''import { useMemo, useState } from "react";
import type { GwMatchesBlock } from "@/types/match";
import { PLAYERS_DATA } from "@/data/players";
import { TEAM_BY_NAME } from "@/config/playersIndex";
import { LeagueLogo, TeamBrand, TeamCrest } from "@/components/branding";
import { H2H_ICON, H2H_PL } from "@/features/fpl/constants";

''',
    "features/standings/lib/standings.ts": '''import { PLAYERS_DATA } from "@/data/players";
import type { GwMatchesBlock, StandingRow } from "@/types/match";

''',
    "features/standings/components/RankChangeBadge.tsx": "",  # no imports
    "features/standings/StandingsView.tsx": '''import { useEffect, useMemo, useState } from "react";
import type { GwMatchesBlock } from "@/types/match";
import { PLAYERS_DATA } from "@/data/players";
import { PLAYER_BY_ID } from "@/config/playersIndex";
import { LeagueLogo, TeamBrand, TeamCrest } from "@/components/branding";
import { buildStandingsHistory } from "@/features/standings/lib/standings";
import { RankChangeBadge } from "@/features/standings/components/RankChangeBadge";

''',
    "features/hall/lib/awards.ts": '''import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";

''',
    "features/hall/components/HallFameCard.tsx": '''import type { ReactNode } from "react";
import { PLAYER_BY_ID } from "@/config/playersIndex";
import { TeamCrest } from "@/components/branding";

''',
    "features/hall/HallOfFameView.tsx": '''import { useMemo } from "react";
import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import { LeagueLogo } from "@/components/branding";
import { HallFameCard } from "@/features/hall/components/HallFameCard";
import { buildExtraHallAwards } from "@/features/hall/lib/awards";

''',
    "app/App.tsx": '''import { useEffect, useMemo, useState } from "react";
import { PLAYERS_DATA } from "@/data/players";
import { TEAM_BY_NAME } from "@/config/playersIndex";
import { getMatchOutcome } from "@/lib/match";
import { FPL_BOOTSTRAP_URL } from "@/services/fpl/api";
import {
  buildPredictedStandings,
  formatOrDisplay,
  getPlayerOrBundle,
  getPredictionForPlayer,
} from "@/features/profiles/lib/or";
import { ProfileExpectationsPanel } from "@/features/profiles/components/ProfileExpectationsPanel";
import { SeasonHighlightsPanel } from "@/features/profiles/components/SeasonHighlightsPanel";
import { LeagueLogo, TeamCrest } from "@/components/branding";
import { HomeNavButton } from "@/features/home/components/HomeNavButton";
import { WynikiView } from "@/features/wyniki/WynikiView";
import { StandingsView } from "@/features/standings/StandingsView";
import { HallOfFameView } from "@/features/hall/HallOfFameView";
import type { Player } from "@/types/player";
import type { GwMatchesBlock } from "@/types/match";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { GladiatorOrMap } from "@/types/or";
import type { FplElementMap } from "@/types/fpl";

''',
}

def prepend(rel: str, header: str) -> None:
    path = SRC / rel
    body = path.read_text(encoding="utf-8")
    if header.strip() and header.strip() in body[:500]:
        return
    path.write_text(header + body, encoding="utf-8")
    print(rel)

for rel, header in HEADERS.items():
    prepend(rel, header)

# Re-export branding components
branding = SRC / "components/branding/index.tsx"
text = branding.read_text(encoding="utf-8")
if "export { TeamCrest" not in text:
    branding.write_text(
        text.rstrip()
        + "\n\nexport { TeamCrest, LeagueLogo, TeamBrand };\n",
        encoding="utf-8",
    )

ui = SRC / "components/ui/index.tsx"
text = ui.read_text(encoding="utf-8")
if "export { StatPill" not in text:
    ui.write_text(text.rstrip() + "\n\nexport { StatPill, InsightCard };\n", encoding="utf-8")

app = SRC / "app/App.tsx"
text = app.read_text(encoding="utf-8")
if "export default" not in text:
    app.write_text(text.replace("export function App", "export default function App", 1), encoding="utf-8")

print("Done.")
