import type { Player } from "@/types/player";
import type { PlayerHighlights } from "@/types/highlights";
import {
  DIFFERENTIAL_GAIN,
  DIFFERENTIAL_LOSS,
  formatDifferentialPick,
  getDifferentialPicks,
} from "@/features/profiles/lib/differentialPicks";

export type DiplomaFact = {
  emoji: string;
  label: string;
  value: string;
};

export type DiplomaContent = {
  rankTitle: string;
  rankSubtitle: string;
  facts: DiplomaFact[];
  thanks: string;
};

function rankTitle(rank: number): { title: string; subtitle: string } {
  if (rank === 1) {
    return {
      title: "Mistrz Igrzysk Kapci Kłapcia",
      subtitle: "Hegemon sezonu 2025/26 — reszta ligi wciąż liczy straty psychiczne.",
    };
  }
  if (rank <= 3) {
    return {
      title: "Podium Areny",
      subtitle: "Elita H2H — blisko tronu, daleko od spokoju.",
    };
  }
  if (rank <= 10) {
    return {
      title: "Zasłużony Gladiator",
      subtitle: "Górna połowa tabeli — solidny wynik w świecie totalnego chaosu.",
    };
  }
  if (rank <= 15) {
    return {
      title: "Weteran Przetrwania",
      subtitle: "Przetrwał 38 kolejek. To już samo w sobie osiągnięcie.",
    };
  }
  return {
    title: "Honorowy Obrońca Piwnicy",
    subtitle: "Dno tabeli, ale serce wciąż bije dla FPL — i dla beznadziejnych hitów.",
  };
}

function autumnTwist(player: Player): string | null {
  const diff = player.gw19Rank - player.rank;
  if (player.gw19Rank === 1 && player.rank > 3) {
    return `Mistrz jesieni (GW19) → finisz #${player.rank}. Jesień mu ufundowała tron, wiosna zabrała taboret.`;
  }
  if (diff >= 8) {
    return `Spadek z #${player.gw19Rank} (jesień) na #${player.rank} — grawitacja FPL nie zna litości.`;
  }
  if (diff <= -8) {
    return `Wiosenny comeback: z #${player.gw19Rank} na #${player.rank}. Arena aplauduje (niektórzy przez zęby).`;
  }
  return null;
}

function organizerThanks(player: Player): string {
  const base =
    "Dziękuję za udział w FPL Arena Sezon 2025/26 — za 38 kolejek emocji, transferów o 3 w nocy i meczów H2H, które nigdy nie były sprawiedliwe.";
  const personal =
    player.rank === 1
      ? " Jako mistrz udowodniłeś, że nienawiść do wyspiarzy może być skuteczną strategią."
      : player.pointsBenched >= 350
        ? " Twój rekord ławki rezerwowych na stałe wpisał się w historię ligi — szacun za konsekwencję."
        : player.hits <= -50
          ? " Twoje hity transferowe były dziełem sztuki — bo nikt inny nie odważyłby się tak bardzo."
          : player.rank >= 18
            ? " Piwnica tabeli bez Ciebie byłaby smutna — dziękuję za dostarczanie materiału na roast w piątki."
            : " Arena bez Ciebie byłaby tylko tabelą Excela — Ty jesteś jej duszą (i często jej problemem).";
  return `${base}${personal}\n\nZ wyrazami szacunku i lekkiej ironii,\n--- St0pa ---\nOrganizator Igrzysk Kapci Kłapcia · FPL Arena`;
}

export function buildDiplomaContent(
  player: Player,
  highlights: PlayerHighlights | null
): DiplomaContent {
  const { title, subtitle } = rankTitle(player.rank);
  const differentials = getDifferentialPicks(highlights, player);
  const facts: DiplomaFact[] = [
    {
      emoji: "⚔️",
      label: "Bilans H2H",
      value: `${player.w}W · ${player.d}R · ${player.l}P (${player.pts} pkt ligowych)`,
    },
    {
      emoji: "📊",
      label: "Score FPL",
      value: `${player.score} pkt overall · śr. poz. ${player.avgPosition.toFixed(2)} w lidze`,
    },
    {
      emoji: "©️",
      label: "Kapitanowski bank",
      value: `${player.captainPts} pkt z opaski · ulubiony wybór: ${player.mostCaptained}`,
    },
    {
      emoji: "⭐",
      label: "Bohater składu",
      value: player.mostPointsPlayer,
    },
    {
      emoji: "🚀",
      label: DIFFERENTIAL_GAIN.title,
      value: differentials.gain
        ? formatDifferentialPick(differentials.gain)
        : "Brak danych sezonowych",
    },
    {
      emoji: "💀",
      label: DIFFERENTIAL_LOSS.title,
      value: differentials.loss
        ? formatDifferentialPick(differentials.loss)
        : "Brak danych sezonowych",
    },
    {
      emoji: "🛋️",
      label: "Punkty na ławce",
      value:
        player.pointsBenched >= 300
          ? `${player.pointsBenched} pkt — artystyczne marnotrawstwo klasy premium`
          : `${player.pointsBenched} pkt — ławka czasem boli, ale Ty to przetrwałeś`,
    },
    {
      emoji: "💥",
      label: "Weekend życia",
      value: player.bestGw,
    },
  ];

  const twist = autumnTwist(player);
  if (twist) {
    facts.push({ emoji: "🍂", label: "Fabuła sezonu", value: twist });
  }

  if (player.winStreak && !player.winStreak.startsWith("0")) {
    facts.push({
      emoji: "🔥",
      label: "Seria H2H",
      value: player.winStreak,
    });
  }

  if (player.monthlyWins && player.monthlyWins !== "Brak") {
    facts.push({
      emoji: "📅",
      label: "Miesiące dominacji",
      value: player.monthlyWins,
    });
  }

  if (player.hits < -20) {
    facts.push({
      emoji: "🪓",
      label: "Rzeźnik transferów",
      value: `${player.hits} pkt kar · ${player.transfers} transferów — F5 zna Cię na imię`,
    });
  }

  const avgGw = highlights?.avgGwPoints as number | undefined;
  if (avgGw) {
    facts.push({
      emoji: "⚙️",
      label: "Maszyna punktowa",
      value: `Średnia ${avgGw} pkt/kolejkę — Excel nigdy nie śpi`,
    });
  }

  const biggestWin = highlights?.biggestWin as
    | { opponent?: string; score?: string; gw?: number }
    | undefined;
  if (biggestWin?.score) {
    facts.push({
      emoji: "🏆",
      label: "Największe zwycięstwo H2H",
      value: `${biggestWin.score} vs ${biggestWin.opponent ?? "?"} (GW${biggestWin.gw ?? "?"})`,
    });
  }

  return {
    rankTitle: title,
    rankSubtitle: subtitle,
    facts: facts.slice(0, 10),
    thanks: organizerThanks(player),
  };
}
