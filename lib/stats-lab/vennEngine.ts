/**
 * Diagram Venna Studio — przydział do 7 pól i układ żetonów.
 * Czyste funkcje, bez Reacta i bez odczytu bazy.
 */

import type { FplPositionType, FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";

export const VENN_REGION_IDS = [
  "A",
  "B",
  "C",
  "AB",
  "AC",
  "BC",
  "ABC",
] as const;

export type VennRegionId = (typeof VENN_REGION_IDS)[number];
export type VennConditionId = "A" | "B" | "C";

export type VennCondition = {
  id: VennConditionId;
  metric: FplStatKey;
  threshold: number;
};

export type VennHistoryRow = {
  gameweek: number;
  minutes?: number | null;
  values?: Partial<Record<string, number | null | undefined>>;
};

export type VennSubject = {
  id: string | number;
  name: string;
  minutes?: number | null;
  points?: number | null;
  totals?: Partial<Record<string, number | null | undefined>>;
  rows?: VennHistoryRow[];
};

export type VennPlaced<T extends VennSubject = VennSubject> = T & {
  values: [number, number, number];
  minutesInScope: number;
  pointsInScope: number;
};

export type VennAssignment<T extends VennSubject = VennSubject> = {
  regions: Record<VennRegionId, VennPlaced<T>[]>;
  /** Minuty wystarczą, żaden próg nie złapany. */
  none: VennPlaced<T>[];
  /** Poniżej progu minut — nie wchodzą do kół. */
  belowMinutes: VennPlaced<T>[];
  atLeastOne: number;
  allThree: number;
};

const REGION_NEEDS: Record<VennRegionId, readonly VennConditionId[]> = {
  A: ["A"],
  B: ["B"],
  C: ["C"],
  AB: ["A", "B"],
  AC: ["A", "C"],
  BC: ["B", "C"],
  ABC: ["A", "B", "C"],
};

export function finiteOrZero(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function meetsThreshold(value: number, threshold: number): boolean {
  if (!Number.isFinite(threshold)) return false;
  return value >= threshold;
}

function scopedMetric(
  subject: VennSubject,
  metric: string,
  gwFrom?: number,
  gwTo?: number,
): { value: number; minutes: number } {
  if (subject.rows) {
    let value = 0;
    let minutes = 0;
    for (const row of subject.rows) {
      const gw = Number(row.gameweek);
      if (!Number.isFinite(gw)) continue;
      if (gwFrom != null && gw < gwFrom) continue;
      if (gwTo != null && gw > gwTo) continue;
      minutes += finiteOrZero(row.minutes);
      value += finiteOrZero(row.values?.[metric]);
    }
    return { value, minutes };
  }
  return {
    value: finiteOrZero(subject.totals?.[metric]),
    minutes: finiteOrZero(subject.minutes),
  };
}

function regionFor(flags: readonly boolean[]): VennRegionId | null {
  const [a, b, c] = flags;
  if (a && b && c) return "ABC";
  if (a && b) return "AB";
  if (a && c) return "AC";
  if (b && c) return "BC";
  if (a) return "A";
  if (b) return "B";
  if (c) return "C";
  return null;
}

function byRank<T extends VennSubject>(
  a: VennPlaced<T>,
  b: VennPlaced<T>,
): number {
  const sum = (p: VennPlaced<T>) => p.values[0] + p.values[1] + p.values[2];
  const diff = sum(b) - sum(a);
  if (diff !== 0) return diff;
  const points = b.pointsInScope - a.pointsInScope;
  if (points !== 0) return points;
  return String(a.id).localeCompare(String(b.id));
}

export function assignPlayersToVennRegions<T extends VennSubject>(args: {
  players: readonly T[];
  conditions: readonly [VennCondition, VennCondition, VennCondition];
  gwFrom?: number;
  gwTo?: number;
  minMinutes?: number;
}): VennAssignment<T> {
  const regions = {
    A: [],
    B: [],
    C: [],
    AB: [],
    AC: [],
    BC: [],
    ABC: [],
  } as Record<VennRegionId, VennPlaced<T>[]>;
  const none: VennPlaced<T>[] = [];
  const belowMinutes: VennPlaced<T>[] = [];
  const minMinutes = finiteOrZero(args.minMinutes);

  for (const player of args.players) {
    const scoped = args.conditions.map((condition) =>
      scopedMetric(player, condition.metric, args.gwFrom, args.gwTo),
    );
    const minutesInScope = scoped.reduce(
      (max, row) => Math.max(max, row.minutes),
      0,
    );
    const values = scoped.map((row) => row.value) as [number, number, number];
    const placed: VennPlaced<T> = {
      ...player,
      values,
      minutesInScope,
      pointsInScope: finiteOrZero(player.points),
    };
    if (minutesInScope < minMinutes) {
      belowMinutes.push(placed);
      continue;
    }
    const flags = args.conditions.map((condition, index) =>
      meetsThreshold(values[index] ?? 0, condition.threshold),
    );
    const region = regionFor(flags);
    if (!region) none.push(placed);
    else regions[region].push(placed);
  }

  for (const id of VENN_REGION_IDS) regions[id].sort(byRank);
  none.sort(byRank);
  belowMinutes.sort(byRank);

  const atLeastOne = VENN_REGION_IDS.reduce(
    (sum, id) => sum + regions[id].length,
    0,
  );
  return {
    regions,
    none,
    belowMinutes,
    atLeastOne,
    allThree: regions.ABC.length,
  };
}

export function shortenPlayerLabel(name: string, max = 12): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = Math.max(1, max - 1);
  return `${clean.slice(0, cut)}…`;
}

export type VennPresetId =
  | "COMPLETE_DEFENDER"
  | "MID_CREATORS"
  | "FWD_FINISHERS"
  | "GK_WALL";

export type VennPreset = {
  id: VennPresetId;
  labelPl: string;
  labelEn: string;
  descriptionPl: string;
  descriptionEn: string;
  positions: FplPositionType[];
  minMinutes: number;
  conditions: [VennCondition, VennCondition, VennCondition];
};

export const VENN_PRESETS: readonly VennPreset[] = [
  {
    id: "COMPLETE_DEFENDER",
    labelPl: "Kompletny obrońca",
    labelEn: "Complete defender",
    descriptionPl:
      "Obrońcy, min. 270 minut: 4+ czyste konta, 3+ gole i asysty, 4+ mecze z progiem DefCon.",
    descriptionEn:
      "Defenders, 270+ minutes: 4+ clean sheets, 3+ goals and assists, 4+ DefCon threshold matches.",
    positions: [2],
    minMinutes: 270,
    conditions: [
      { id: "A", metric: "clean_sheets", threshold: 4 },
      { id: "B", metric: "goals_assists", threshold: 3 },
      { id: "C", metric: "dc_bonus_matches", threshold: 4 },
    ],
  },
  {
    id: "MID_CREATORS",
    labelPl: "Pomocnicy — G+A, xGI, bonus",
    labelEn: "Midfielders — G+A, xGI, bonus",
    descriptionPl:
      "Pomocnicy, min. 270 minut: 3+ gole i asysty, 3+ xGI, 4+ punkty bonusowe.",
    descriptionEn:
      "Midfielders, 270+ minutes: 3+ goals and assists, 3+ xGI, 4+ bonus points.",
    positions: [3],
    minMinutes: 270,
    conditions: [
      { id: "A", metric: "goals_assists", threshold: 3 },
      { id: "B", metric: "expected_goal_involvements", threshold: 3 },
      { id: "C", metric: "bonus", threshold: 4 },
    ],
  },
  {
    id: "FWD_FINISHERS",
    labelPl: "Napastnicy — gole, xG, bonus",
    labelEn: "Forwards — goals, xG, bonus",
    descriptionPl:
      "Napastnicy, min. 270 minut: 4+ gole, 3+ oczekiwane gole, 3+ punkty bonusowe.",
    descriptionEn:
      "Forwards, 270+ minutes: 4+ goals, 3+ expected goals, 3+ bonus points.",
    positions: [4],
    minMinutes: 270,
    conditions: [
      { id: "A", metric: "goals_scored", threshold: 4 },
      { id: "B", metric: "expected_goals", threshold: 3 },
      { id: "C", metric: "bonus", threshold: 3 },
    ],
  },
  {
    id: "GK_WALL",
    labelPl: "Bramkarze — CS, obrony, bonus",
    labelEn: "Goalkeepers — CS, saves, bonus",
    descriptionPl:
      "Bramkarze, min. 270 minut: 3+ czyste konta, 20+ obron, 2+ punkty bonusowe.",
    descriptionEn:
      "Goalkeepers, 270+ minutes: 3+ clean sheets, 20+ saves, 2+ bonus points.",
    positions: [1],
    minMinutes: 270,
    conditions: [
      { id: "A", metric: "clean_sheets", threshold: 3 },
      { id: "B", metric: "saves", threshold: 20 },
      { id: "C", metric: "bonus", threshold: 2 },
    ],
  },
];

export function getVennPreset(id: VennPresetId): VennPreset {
  const found = VENN_PRESETS.find((preset) => preset.id === id);
  if (!found) return VENN_PRESETS[0];
  return found;
}

export function cloneVennConditions(
  conditions: readonly VennCondition[],
): [VennCondition, VennCondition, VennCondition] {
  const [a, b, c] = conditions;
  return [
    { ...a },
    { ...b },
    { ...c },
  ];
}

/** Nakłada preset na filtr Studio. Zostawia okres, kluby i cenę. */
export function applyVennPresetToFilter(
  filter: StatsLabQueryFilter,
  presetId: VennPresetId,
): StatsLabQueryFilter {
  const preset = getVennPreset(presetId);
  return {
    ...filter,
    positions: [...preset.positions],
    minMinutes: preset.minMinutes,
    per90: false,
    returnAllEligible: true,
    selectedPlayerIds: [],
    sortByComposite: false,
    sortByStat: "total_points",
    sortDirection: "DESC",
  };
}

/* ─────────────────────────────────────────────────
 * Geometria kół i siatka żetonów
 * ───────────────────────────────────────────────── */

export const VENN_VIEW = { w: 960, h: 860 } as const;

export type VennCircle = { cx: number; cy: number; r: number };

export const VENN_CIRCLES: Record<VennConditionId, VennCircle> = {
  A: { cx: 318, cy: 330, r: 236 },
  B: { cx: 642, cy: 330, r: 236 },
  C: { cx: 480, cy: 536, r: 236 },
};

export type VennBox = {
  x: number;
  y: number;
  hw: number;
  hh: number;
};

const TOKEN_BOX = {
  normal: { hw: 28, hh: 15 },
  center: { hw: 34, hh: 20 },
  count: { hw: 26, hh: 10 },
} as const;

export const VENN_TOKEN_SIZE = {
  normal: { w: TOKEN_BOX.normal.hw * 2, h: TOKEN_BOX.normal.hh * 2 },
  center: { w: TOKEN_BOX.center.hw * 2, h: TOKEN_BOX.center.hh * 2 },
  count: { w: TOKEN_BOX.count.hw * 2, h: TOKEN_BOX.count.hh * 2 },
} as const;

const SLOT_CAP = { normal: 8, center: 4 } as const;

export function boxesOverlap(a: VennBox, b: VennBox, gap = 4): boolean {
  return (
    Math.abs(a.x - b.x) < a.hw + b.hw + gap &&
    Math.abs(a.y - b.y) < a.hh + b.hh + gap
  );
}

export function pointInVennRegion(
  x: number,
  y: number,
  region: VennRegionId,
  pad: number,
  circles: Record<VennConditionId, VennCircle> = VENN_CIRCLES,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(pad)) {
    return false;
  }
  const needs = REGION_NEEDS[region];
  const ids: VennConditionId[] = ["A", "B", "C"];
  for (const id of ids) {
    const circle = circles[id];
    const dist = Math.hypot(x - circle.cx, y - circle.cy);
    if (needs.includes(id)) {
      if (dist + pad > circle.r - 2) return false;
    } else if (dist - pad < circle.r + 2) {
      return false;
    }
  }
  return true;
}

export type VennRegionLayout = {
  count: { x: number; y: number };
  slots: { x: number; y: number }[];
};

function boxFor(region: VennRegionId): { hw: number; hh: number } {
  return region === "ABC" ? TOKEN_BOX.center : TOKEN_BOX.normal;
}

/** Cały prostokąt żetonu leży w polu (narożniki, nie tylko środek). */
export function boxInsideVennRegion(
  box: VennBox,
  region: VennRegionId,
): boolean {
  const corners: Array<[number, number]> = [
    [box.x - box.hw, box.y - box.hh],
    [box.x + box.hw, box.y - box.hh],
    [box.x - box.hw, box.y + box.hh],
    [box.x + box.hw, box.y + box.hh],
  ];
  return corners.every(([x, y]) => pointInVennRegion(x, y, region, 1));
}

function layoutOne(region: VennRegionId): VennRegionLayout {
  const box = boxFor(region);
  const step = 8;
  const candidates: { x: number; y: number }[] = [];
  for (let y = 24; y <= VENN_VIEW.h - 24; y += step) {
    for (let x = 24; x <= VENN_VIEW.w - 24; x += step) {
      if (boxInsideVennRegion({ x, y, ...box }, region)) {
        candidates.push({ x, y });
      }
    }
  }

  const countBox = TOKEN_BOX.count;
  const countCandidates: { x: number; y: number }[] = [];
  for (let y = 24; y <= VENN_VIEW.h - 24; y += step) {
    for (let x = 24; x <= VENN_VIEW.w - 24; x += step) {
      if (boxInsideVennRegion({ x, y, ...countBox }, region)) {
        countCandidates.push({ x, y });
      }
    }
  }
  const pool = countCandidates.length ? countCandidates : candidates;
  // Licznik przy górnej krawędzi pola — środek zostaje na żetony.
  const count = pool.length
    ? [...pool].sort((a, b) => a.y - b.y || a.x - b.x)[0]
    : { x: VENN_CIRCLES.A.cx, y: VENN_CIRCLES.A.cy };

  const reserved: VennBox = {
    x: count.x,
    y: count.y,
    hw: countBox.hw,
    hh: countBox.hh,
  };
  const cap = region === "ABC" ? SLOT_CAP.center : SLOT_CAP.normal;
  const slots: { x: number; y: number }[] = [];
  const taken: VennBox[] = [reserved];
  const ordered = [...candidates].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const point of ordered) {
    if (slots.length >= cap) break;
    const next: VennBox = { x: point.x, y: point.y, hw: box.hw, hh: box.hh };
    if (taken.some((prev) => boxesOverlap(prev, next))) continue;
    taken.push(next);
    slots.push(point);
  }

  return { count, slots };
}

const LAYOUT_CACHE = new Map<VennRegionId, VennRegionLayout>();

export function layoutVennRegion(region: VennRegionId): VennRegionLayout {
  const cached = LAYOUT_CACHE.get(region);
  if (cached) return cached;
  const layout = layoutOne(region);
  LAYOUT_CACHE.set(region, layout);
  return layout;
}

export type VennTokenPlan = {
  shown: number;
  overflow: number;
  slots: { x: number; y: number }[];
};

/** Ile żetonów widać w polu. Ostatni slot przy nadmiarze to „+N”. */
export function planVennTokens(
  region: VennRegionId,
  playerCount: number,
): VennTokenPlan {
  const slots = layoutVennRegion(region).slots;
  const count = Math.max(0, Math.floor(finiteOrZero(playerCount)));
  if (count <= 0 || slots.length === 0) {
    return { shown: 0, overflow: count, slots: [] };
  }
  if (count <= slots.length) {
    return { shown: count, overflow: 0, slots: slots.slice(0, count) };
  }
  const shown = slots.length - 1;
  return {
    shown,
    overflow: count - shown,
    slots: slots.slice(0, slots.length),
  };
}
