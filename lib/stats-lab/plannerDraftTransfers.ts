import type {
  GwPlanDecision,
  PlannedTransfer,
} from "@/lib/stats-lab/plannerEngine";

/**
 * Dopisuje transfer i podmienia id w kolejności składu.
 * Samo usunięcie transferu bez tej podmiany zostawiało kupione id w lineupOrder.
 * Silnik nie miał gracza w kadrze i wstawiał pusty wpis za £5.0m.
 */
export function appendPlannedTransfer(
  decision: GwPlanDecision,
  transfer: PlannedTransfer,
  squadLineup: number[],
): GwPlanDecision {
  const order = decision.lineupOrder ?? squadLineup;
  return {
    ...decision,
    transfers: [...decision.transfers, transfer],
    lineupOrder: order.map((id) =>
      id === transfer.outElementId ? transfer.inElementId : id,
    ),
  };
}

function withoutTransfer(
  decision: GwPlanDecision,
  transfer: PlannedTransfer,
): GwPlanDecision {
  const roles = transfer.captainBefore
    ? {
        captainElementId: transfer.captainBefore.captainElementId,
        viceCaptainElementId: transfer.captainBefore.viceCaptainElementId,
        captainClearedByUser: transfer.captainBefore.captainClearedByUser,
        viceClearedByUser: transfer.captainBefore.viceClearedByUser,
      }
    : {
        captainElementId:
          decision.captainElementId === transfer.inElementId
            ? transfer.outElementId
            : decision.captainElementId,
        viceCaptainElementId:
          decision.viceCaptainElementId === transfer.inElementId
            ? transfer.outElementId
            : decision.viceCaptainElementId,
      };
  return {
    ...decision,
    transfers: decision.transfers.filter((row) => row.id !== transfer.id),
    lineupOrder: decision.lineupOrder?.map((id) =>
      id === transfer.inElementId ? transfer.outElementId : id,
    ),
    ...roles,
  };
}

/** Usunięcie transferu z listy (ten sam skutek co ✕ na kupionym). */
export function removePlannedTransfer(
  decision: GwPlanDecision,
  transferId: string,
): GwPlanDecision {
  const transfer = decision.transfers.find((row) => row.id === transferId);
  if (!transfer) return decision;
  return withoutTransfer(decision, transfer);
}

/**
 * ✕ na graczu kupionym w tej kolejce cofa ten transfer:
 * wraca sprzedany, lineupOrder z powrotem wskazuje jego id.
 * Gdy ten sam id został później sprzedany dalej, nie cofamy (zostaje zwykła sprzedaż).
 */
export function undoPurchaseOfElement(
  decision: GwPlanDecision,
  inElementId: number,
): { decision: GwPlanDecision; undone: boolean } {
  const transfer = [...decision.transfers]
    .reverse()
    .find((row) => !row.hasConflict && row.inElementId === inElementId);
  if (!transfer) return { decision, undone: false };
  const soldOnLater = decision.transfers.some(
    (row) =>
      row.id !== transfer.id &&
      !row.hasConflict &&
      row.outElementId === inElementId,
  );
  if (soldOnLater) return { decision, undone: false };
  return { decision: withoutTransfer(decision, transfer), undone: true };
}
