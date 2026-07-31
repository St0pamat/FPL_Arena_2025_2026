import { useEffect, useState } from "react";
import type { GwMatchesBlock } from "@arena/types/match";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import type { PlayerSeasonHistoryMap } from "@arena/types/seasonHistory";
import type { GladiatorOrMap } from "@arena/types/or";

export function useLeagueData() {
  const [matchesByGw, setMatchesByGw] = useState<GwMatchesBlock[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [playerHighlights, setPlayerHighlights] = useState<PlayerHighlightsMap>({});
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [seasonHistory, setSeasonHistory] = useState<PlayerSeasonHistoryMap>({});
  const [seasonHistoryLoading, setSeasonHistoryLoading] = useState(true);
  const [gladiatorOr, setGladiatorOr] = useState<GladiatorOrMap>({});

  useEffect(() => {
    let isMounted = true;

    fetch("/wyniki_meczy.json")
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się odczytać terminarza.");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) setMatchesByGw(data);
      })
      .catch(() => {
        if (isMounted) setMatchesByGw([]);
      })
      .finally(() => {
        if (isMounted) setMatchesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/player_highlights.json")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (isMounted && data && typeof data === "object") setPlayerHighlights(data);
      })
      .catch(() => {
        if (isMounted) setPlayerHighlights({});
      })
      .finally(() => {
        if (isMounted) setHighlightsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/player_season_history.json")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (isMounted && data && typeof data === "object") setSeasonHistory(data);
      })
      .catch(() => {
        if (isMounted) setSeasonHistory({});
      })
      .finally(() => {
        if (isMounted) setSeasonHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch("/gladiator_or.json")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (isMounted && data && typeof data === "object") setGladiatorOr(data);
      })
      .catch(() => {
        if (isMounted) setGladiatorOr({});
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    matchesByGw,
    matchesLoading,
    playerHighlights,
    highlightsLoading,
    seasonHistory,
    seasonHistoryLoading,
    gladiatorOr,
  };
}
