/**
 * A4 — logika ról C/VC jak w FPL (swap zamiast nullowania).
 * Stan decyzji tylko w localStorage (przez StatsLabPlannerClient).
 */

export type CaptainViceIds = {
  captainElementId: number | null;
  viceCaptainElementId: number | null;
  captainClearedByUser?: boolean;
  viceClearedByUser?: boolean;
};

export type CaptainViceDecisionPatch = {
  captainElementId: number | null;
  viceCaptainElementId: number | null;
  captainClearedByUser: boolean;
  viceClearedByUser: boolean;
};

/**
 * Ustawienie C: na obecnym VC → zamiana ról (gdy C też było ustawione);
 * gdy C puste a cel to VC → C=X, VC=null + viceClearedByUser.
 * Inwariant „VC nie null po swapie” tylko gdy przed swapem obie role były ustawione.
 */
export function assignCaptain(
  current: CaptainViceIds,
  elementId: number,
): CaptainViceDecisionPatch {
  const cap = current.captainElementId ?? null;
  const vice = current.viceCaptainElementId ?? null;
  if (vice != null && vice === elementId) {
    return {
      captainElementId: elementId,
      viceCaptainElementId: cap,
      captainClearedByUser: false,
      // pusty C → VC nie dostaje „starego” C; gracz musi wybrać VC ponownie
      viceClearedByUser: cap == null ? true : false,
    };
  }
  return {
    captainElementId: elementId,
    viceCaptainElementId: vice,
    captainClearedByUser: false,
    viceClearedByUser: current.viceClearedByUser ?? false,
  };
}

/**
 * Ustawienie VC: na obecnym C → zamiana ról (gdy VC też było ustawione);
 * gdy VC puste a cel to C → VC=X, C=null + captainClearedByUser.
 */
export function assignViceCaptain(
  current: CaptainViceIds,
  elementId: number,
): CaptainViceDecisionPatch {
  const cap = current.captainElementId ?? null;
  const vice = current.viceCaptainElementId ?? null;
  if (cap != null && cap === elementId) {
    return {
      captainElementId: vice,
      viceCaptainElementId: elementId,
      captainClearedByUser: vice == null ? true : false,
      viceClearedByUser: false,
    };
  }
  return {
    captainElementId: cap,
    viceCaptainElementId: elementId,
    captainClearedByUser: current.captainClearedByUser ?? false,
    viceClearedByUser: false,
  };
}

/**
 * Po sprzedaży / zejściu z XI: wyczyść rolę elementu.
 * Druga rola bez zmian. Ustawia flagi clearedByUser dla wyczyszczonych ról.
 *
 * `effective` — role z evaluate (auto-fill `ensureCaptainVice`), gdy decyzja GW
 * nie ma jeszcze zapisanego id. Bez tego sprzedaż/ławka auto-C nic by nie czyściła
 * i silnik dobierałby nowego kapitana.
 */
export function clearRolesForElement(
  current: CaptainViceIds,
  elementId: number,
  effective?: {
    captainElementId?: number | null;
    viceCaptainElementId?: number | null;
  },
): CaptainViceDecisionPatch {
  const matchCap =
    current.captainElementId ?? effective?.captainElementId ?? null;
  const matchVice =
    current.viceCaptainElementId ?? effective?.viceCaptainElementId ?? null;
  const clearCap = matchCap === elementId;
  const clearVice = matchVice === elementId;
  return {
    captainElementId: clearCap ? null : (current.captainElementId ?? null),
    viceCaptainElementId: clearVice
      ? null
      : (current.viceCaptainElementId ?? null),
    captainClearedByUser: clearCap
      ? true
      : (current.captainClearedByUser ?? false),
    viceClearedByUser: clearVice
      ? true
      : (current.viceClearedByUser ?? false),
  };
}

/**
 * Auto-fill tylko gdy rola nigdy nie była jawnie ustawiona / wyczyszczona przez gracza.
 * - captainClearedByUser → nie
 * - captainElementId number → nie (była ustawiona; nawet jeśli wypadła z XI)
 * - undefined lub null bez flagi (plan sprzed A4 / świeża GW) → tak
 */
export function shouldAutoFillCaptain(decision: {
  captainElementId?: number | null;
  captainClearedByUser?: boolean;
}): boolean {
  if (decision.captainClearedByUser) return false;
  if (decision.captainElementId != null) return false;
  return true;
}

export function shouldAutoFillVice(decision: {
  viceCaptainElementId?: number | null;
  viceClearedByUser?: boolean;
}): boolean {
  if (decision.viceClearedByUser) return false;
  if (decision.viceCaptainElementId != null) return false;
  return true;
}
