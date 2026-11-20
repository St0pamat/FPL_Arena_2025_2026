/**
 * Geometria rogów karty U7.
 * Widoczna ikona 20 px w rogu karty. Pole dotyku 32 px wychodzi w lukę
 * między kartami (4 px) i nad kartę (8 px), nie na koszulkę.
 * Poniżej 102 px przyciski są schowane (arkusz akcji).
 */
export const PLANNER_CARD_CHROME = {
  iconPx: 20,
  hitPx: 32,
  hitOutsetXPx: 4,
  hitOutsetYPx: 8,
  shirtMarginTopPx: 2,
  shirtMaxPx: 46,
  shirtMinPx: 28,
  shirtCqw: 0.44,
  shirtAspect: 56 / 60,
  cornerActionsMinPx: 102,
} as const;

export type CardBox = { x: number; y: number; w: number; h: number };

export function plannerShirtBox(cardWidthPx: number): CardBox {
  const raw = cardWidthPx * PLANNER_CARD_CHROME.shirtCqw;
  const w = Math.min(
    PLANNER_CARD_CHROME.shirtMaxPx,
    Math.max(PLANNER_CARD_CHROME.shirtMinPx, raw),
  );
  return {
    x: (cardWidthPx - w) / 2,
    y: PLANNER_CARD_CHROME.shirtMarginTopPx,
    w,
    h: w * PLANNER_CARD_CHROME.shirtAspect,
  };
}

/** Prostokąt pola dotyku (nie samej ikony). */
export function plannerCornerHitBox(
  side: "sell" | "swap",
  cardWidthPx: number,
): CardBox {
  const { hitPx, hitOutsetXPx, hitOutsetYPx } = PLANNER_CARD_CHROME;
  const x =
    side === "sell"
      ? -hitOutsetXPx
      : cardWidthPx - (hitPx - hitOutsetXPx);
  return { x, y: -hitOutsetYPx, w: hitPx, h: hitPx };
}

export function cardBoxesOverlap(a: CardBox, b: CardBox): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Czy pole dotyku weszłoby na koszulkę, gdyby przyciski były widoczne. */
export function cornerHitWouldOverlapShirt(cardWidthPx: number): boolean {
  const shirt = plannerShirtBox(cardWidthPx);
  return (
    cardBoxesOverlap(plannerCornerHitBox("sell", cardWidthPx), shirt) ||
    cardBoxesOverlap(plannerCornerHitBox("swap", cardWidthPx), shirt)
  );
}

/**
 * Przyciski rogów są w DOM tylko od 102 px.
 * Węższa karta ich nie rysuje, więc nie ma nachodzenia.
 */
export function cornerActionsOverlapShirt(cardWidthPx: number): boolean {
  if (cardWidthPx < PLANNER_CARD_CHROME.cornerActionsMinPx) return false;
  return cornerHitWouldOverlapShirt(cardWidthPx);
}
