# Na Minusie ™ — Przegląd projektu

> Ostatnia aktualizacja: **Faza 2** — landing page rekrutacyjny Na Minusie ™.

## Wizja

Platforma łączy dwa światy Fantasy Premier League:

| Projekt | Ścieżka | Rola |
|---------|---------|------|
| **FPL Arena** | `/arena` | Archiwum zakończonej ligi H2H — Skarb Kibica, profile gladiatorów, tabela, Panteon |
| **Na Minusie ™** | `/na-minusie` | Aktywna liga H2H z innowacyjnym systemem punktacji i automatyzacją |

Ekran główny (`/`) pełni rolę portalu wyboru między oboma projektami.

---

## Regulamin Ligi Na Minusie ™ — założenia

### Struktura rozgrywek

- **10-osobowe dywizje** odwzorowujące angielską piramidę piłkarską (awans/spadek między poziomami).
- **Dwa niezależne sezony w roku**: Jesienny i Wiosenny.
- Format **Head-to-Head (H2H)** — bezpośrednie mecze między menedżerami w ramach dywizji.

### System punktacji „Mediana 2+1”

Innowacyjny model łączący wynik meczu H2H z wynikiem względem mediany dywizji:

| Składnik | Punkty |
|----------|--------|
| Wygrana meczu H2H | **2 pkt** |
| Remis H2H | **1 pkt** |
| Wynik powyżej mediany dywizji w danej kolejce | **+1 pkt** (bonus) |

Mediana dywizji to punkt odniesienia — nagradza menedżerów, którzy w danej kolejce zagrali lepiej niż „środek stawki”, niezależnie od bezpośredniego wyniku meczu.

### Automatyzacja

- **Terminarz Bergera** — generowany automatycznie dla każdej dywizji.
- **Statystyki** — zbierane i prezentowane na bieżąco.
- **Grafiki** — automatyczne generowanie materiałów promocyjnych i podsumowań kolejek.

---

## Faza 1 — co zostało zrobione

- [x] Inicjalizacja **Next.js 14** (App Router) jako głównego entry pointu platformy.
- [x] Ekran powitalny (`/`) z dwoma interaktywnymi kartami portalu.
- [x] Placeholder `/arena` z przyciskiem powrotu.
- [x] Globalny styl gamingowy (ciemne tło, gradienty, glow, backdrop-blur).
- [x] Dokumentacja: `project_overview.md` + `architecture.md`.

## Faza 2 (polish) — co zostało zrobione

- [x] Logotypy portalu w `public/images/` na kartach splash screen (`PortalCard` + `next/image`).
- [x] Pełna integracja FPL Arena pod `/arena` (legacy `src/` przez alias `@arena`).
- [x] Oficjalne linki Discord i formularza w `lib/na-minusie.ts`.
- [x] `sync-public.mjs` kopiuje też logotypy portalu (źródła: `logo/`, `assets/portals/`).

## Kolejne fazy (plan)

| Faza | Zakres |
|------|--------|
| **3** | Model danych Na Minusie — dywizje, sezony, gracze |
| **4** | Silnik punktacji Mediana 2+1 + terminarz Bergera |
| **5** | Dashboard menedżera, tabela dywizji, statystyki |
| **6** | Generator grafik i eksport materiałów |
| **—** | Integracja legacy FPL Arena pod `/arena` (rewrite / statyczny eksport) |

---

## Powiązane dokumenty

- [`architecture.md`](./architecture.md) — stos technologiczny, routing, struktura folderów
- [`TECHNICAL.md`](./TECHNICAL.md) — dokumentacja legacy FPL Arena (Vite)
