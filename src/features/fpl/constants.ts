export const EVENT_TYPE_LABELS = {
    minutes: "Występy (minuty na boisku)",
    clean_sheets: "Czyste konta",
    goals_scored: "Bramki",
    assists: "Asysty",
    bonus: "Punkty bonusowe (BPS)",
    defensive_contribution: "Defcon (wkład w obronie)",
    saves: "Obrony bramkarza (saves)",
    goals_conceded: "Stracone gole (obrońcy / GK)",
    yellow_cards: "Żółte kartki",
    red_cards: "Czerwone kartki",
    penalties_missed: "Niewykorzystane karne",
    own_goals: "Gole samobójcze"
};

export const EVENT_TYPE_ICONS = {
    minutes: "⏱️",
    clean_sheets: "🧤",
    goals_scored: "⚽",
    assists: "🅰️",
    bonus: "⭐",
    defensive_contribution: "🛡️",
    saves: "🧤",
    goals_conceded: "📉",
    yellow_cards: "🟨",
    red_cards: "🟥",
    penalties_missed: "❌",
    own_goals: "😱"
};

export const POSITION_COLORS = {
    1: { border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-300", bar: "from-cyan-600 to-cyan-400" },
    2: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-300", bar: "from-blue-600 to-blue-400" },
    3: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-300", bar: "from-violet-600 to-violet-400" },
    4: { border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-300", bar: "from-rose-600 to-rose-400" }
};

export const POSITION_SECTIONS = {
    1: { title: "Bramkarz", short: "GK", icon: "🧤" },
    2: { title: "Obrońcy", short: "OB", icon: "🛡️" },
    3: { title: "Pomocnicy", short: "POM", icon: "⚙️" },
    4: { title: "Napastnicy", short: "NAP", icon: "⚽" },
} as const;

export const H2H_PL = { W: "Wygrana", D: "Remis", L: "Porażka" };
export const H2H_ICON = { W: "✓", D: "=", L: "✗" };
