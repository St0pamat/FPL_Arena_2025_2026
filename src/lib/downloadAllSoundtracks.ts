export type SoundtrackDownloadItem = {
  url: string;
  filename: string;
};

const DELAY_MS = 450;

/** Kolejne pobrania z krotkim opoznieniem (ograniczenie blokady wielu downloadow w przegladarce). */
export async function downloadAllSoundtracks(
  items: SoundtrackDownloadItem[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const { url, filename } = items[i]!;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onProgress?.(i + 1, items.length);
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
}

export function soundtrackWavDownloadName(order: number, playerLabel: string): string {
  return `${String(order).padStart(2, "0")}-${playerLabel.replace(/[^\p{L}\p{N}.-]+/gu, "-")}.wav`;
}
