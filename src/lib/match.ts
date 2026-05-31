import type { MatchOutcome } from "@/types/match";

export const getMatchOutcome = (goalsFor: number, goalsAgainst: number): MatchOutcome => {
    if (goalsFor > goalsAgainst) return "W";
    if (goalsFor < goalsAgainst) return "L";
    return "D";
};
