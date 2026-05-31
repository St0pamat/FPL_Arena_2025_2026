import { useEffect, useState } from "react";
import { FPL_BOOTSTRAP_URL } from "@/services/fpl/api";
import type { GwMatchesBlock } from "@/types/match";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { PlayerSeasonHistoryMap } from "@/types/seasonHistory";
import type { GladiatorOrMap } from "@/types/or";
import type { FplElementMap } from "@/types/fpl";

export function useLeagueData() {
  const [matchesByGw, setMatchesByGw] = useState<GwMatchesBlock[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [playerHighlights, setPlayerHighlights] = useState<PlayerHighlightsMap>({});
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [seasonHistory, setSeasonHistory] = useState<PlayerSeasonHistoryMap>({});
  const [seasonHistoryLoading, setSeasonHistoryLoading] = useState(true);
  const [gladiatorOr, setGladiatorOr] = useState<GladiatorOrMap>({});
  const [fplPlayersById, setFplPlayersById] = useState<FplElementMap>({});

  useEffect(() => {
    let isMounted = true;

    fetch(FPL_BOOTSTRAP_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.elements) return;
        const map: FplElementMap = {};
        data.elements.forEach((el: FplElementMap[number]) => {
          map[el.id] = {
            id: el.id,
            web_name: el.web_name,
            photo: el.photo,
            element_type: el.element_type,
          };
        });
        setFplPlayersById(map);
      })
      .catch(() => {
        if (isMounted) setFplPlayersById({});
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    fplPlayersById,
  };
}
