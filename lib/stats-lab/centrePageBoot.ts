/**
 * Start Stats Centre przy wejściu na stronę (F5 / pierwsze SSR).
 * Brak wyniku to `null`, nie pusta tablica. Zawieszenie kończy się błędem.
 */

import { logStatsCentreLoadError } from "@/lib/stats-lab/statsCentreI18n";
import {
  createDefaultStatsCentreFilter,
  type StatsCentreFilter,
  type StatsCentreResult,
} from "@/lib/stats-lab/statsCentreEngine";

/** Klient i serwer: po tym czasie wiszące wczytanie przechodzi w błąd z retry. */
export const CENTRE_QUERY_TIMEOUT_MS = 12_000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        Object.assign(new Error("CENTRE_LOAD_TIMEOUT"), { code: "TIMEOUT" }),
      );
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function loadCentrePageBoot(input: {
  tab: string | null | undefined;
  seasonCode: string;
  load: (
    filter: StatsCentreFilter,
  ) => Promise<StatsCentreResult>;
  timeoutMs?: number;
}): Promise<{
  initialResult: StatsCentreResult | null;
  initialError: boolean;
}> {
  if (input.tab !== "centre") {
    return { initialResult: null, initialError: false };
  }
  const filter = createDefaultStatsCentreFilter(input.seasonCode);
  try {
    const result = await withTimeout(
      input.load(filter),
      input.timeoutMs ?? CENTRE_QUERY_TIMEOUT_MS,
    );
    return { initialResult: result, initialError: false };
  } catch (err) {
    logStatsCentreLoadError(err);
    return { initialResult: null, initialError: true };
  }
}
