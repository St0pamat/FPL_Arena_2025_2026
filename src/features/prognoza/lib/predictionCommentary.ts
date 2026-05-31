import type { Player } from "@/types/player";
import type { OrBundle, PredictedStandingEntry } from "@/features/profiles/lib/or";
import { formatOrDisplay, orTierLabel } from "@/features/profiles/lib/or";

export type PredictionOutcome = "smash" | "beat" | "close" | "miss" | "disaster" | "debut";

export function getPredictionOutcome(
  player: Player,
  entry: PredictedStandingEntry
): PredictionOutcome {
  if (entry.isDebut) return "debut";
  if (entry.predictedRank == null) return "close";
  const delta = entry.predictedRank - player.rank;
  if (delta >= 8) return "smash";
  if (delta >= 3) return "beat";
  if (delta <= -8) return "disaster";
  if (delta <= -3) return "miss";
  return "close";
}

const OUTCOME_LABEL: Record<PredictionOutcome, string> = {
  smash: "Miażdżące przebicie prognozy",
  beat: "Powyżej oczekiwań",
  close: "Zgodnie z historią OR",
  miss: "Poniżej oczekiwań",
  disaster: "Katastrofa vs oczekiwania z OR",
  debut: "Debiut bez historii OR",
};

export function getOutcomeLabel(outcome: PredictionOutcome): string {
  return OUTCOME_LABEL[outcome];
}

export function buildPredictionComment(
  player: Player,
  entry: PredictedStandingEntry,
  orBundle: OrBundle
): string {
  const predicted = entry.predictedRank;
  const actual = player.rank;
  const delta = predicted != null ? predicted - actual : null;
  const orText = entry.historicalOr != null ? formatOrDisplay(entry.historicalOr) : null;
  const tier = entry.historicalOr != null ? orTierLabel(entry.historicalOr) : null;

  if (entry.isDebut) {
    if (actual === 1) {
      return "Zero historii w Akta, a wziął mistrzostwo. Excel przed sezonem wyszedł na kawę i nie wrócił.";
    }
    if (actual <= 3) {
      return "Debiutant spisany na stratę — podium mówi: „nice try, eksperci”.";
    }
    if (actual >= 18) {
      return "Bez OR w kartotece i bez miejsca w tabeli. Prognoza mówiła „nie wiemy” — trafiliśmy w punkt.";
    }
    return "Nowa twarz bez historii w FPL. Sezon jak pierwsza randka: nikt nie wiedział, czego się spodziewać.";
  }

  if (actual === 1 && predicted !== 1) {
    return `Typowano na ${predicted}. miejsce (OR ${orText}). Tabela H2H uznała, że historia OR to tylko dekoracja.`;
  }

  if (predicted === 1 && actual > 3) {
    return `Faworyt numer jeden przed GW1 — OR ${orText}, ${tier}. Skończył na ${actual}. miejscu. Klasyczny „trust the process”.`;
  }

  if (delta != null && delta >= 12) {
    return `OR ${orText} sugerował ~${predicted}. lokatę. Dostał ${actual}. — jak zamówić Ferrari, a przyjechał rower z trąbką.`;
  }

  if (delta != null && delta >= 5) {
    return `Historia mówiła „top ${predicted}”, tabela powiedziała „#${actual}”. Reputacja została w szatni.`;
  }

  if (delta != null && delta >= 3) {
    return `Niedoceniony przez arkusze: z ${predicted}. na ${actual}. — miłe zaskoczenie dla wszystkich oprócz rywali.`;
  }

  if (delta != null && delta <= -12) {
    return `Faworyt z OR ${orText} miał grać o czołówkę. ${actual}. miejsce to mem na cały sezon.`;
  }

  if (delta != null && delta <= -5) {
    return `Typowano ${predicted}., wylądował ${actual}. — reputacja z OR nie wzięła urlopu, ale forma wzięła.`;
  }

  if (delta != null && delta <= -3) {
    return `Spodziewano się wyżej (~${predicted}.). Tabela H2H była bardziej surowa: ${actual}.`;
  }

  if (player.gw19Rank <= 3 && actual > player.gw19Rank + 5) {
    return `Jesień (${player.gw19Rank}.) obiecywała więcej. Wiosna wysłała fakturę — finisz na ${actual}.`;
  }

  if (player.gw19Rank >= 15 && actual < player.gw19Rank - 5) {
    return `Po przerwie wyglądał na skazanego na dół (${player.gw19Rank}.). Awansował do ${actual}. — comeback dla purystów chaosu.`;
  }

  if (orBundle.seasonOr != null && entry.historicalOr != null && orBundle.seasonOr < entry.historicalOr) {
    return `Życiówka w FPL Classic (OR ${formatOrDisplay(orBundle.seasonOr)}), a H2H i tak na ${actual}. — dwa różne filmy.`;
  }

  if (Math.abs(delta ?? 0) <= 2) {
    return `Prognoza ~${predicted}., wynik ${actual}. — stabilny sezon: typ z OR się trzymał, ale też nie zachwycił.`;
  }

  return `OR ${orText ?? "—"} → typ ${predicted}., finał ${actual}. Sezon w pigułce: bez fajerwerków, bez totalnej porażki.`;
}
