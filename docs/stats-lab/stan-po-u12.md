# Stan po U12

Jedna zmiana: znacznik kontuzji w Planerze, przełącznik nazw kryteriów, tabela predykcji piłkarzy. Bez zapisów do bazy, bez migracji, bez synchronizacji FPL i bez e2e na produkcji. Moduł „Baza i Synchronizacja FPL” bez zmian. Wzory xPts bez zmian.

## Kontuzje

Aplikacja już czyta z wiersza zawodnika:

- `status` (`a` / `d` / `i` / `s` / `u` / `n`)
- `chance_of_playing_next_round`
- `news`

Znacznik jest na tabliczce nazwiska (nie na koszulce), w Rynku, w tabeli wielu kolejek, w oknie Info i na eksporcie. 75 żółty, 50 pomarańczowy, 25 i 0 czerwone. Dostępny bez obniżonej szansy nie dostaje plakietki.

Tych kolumn nie ma w odczycie i nie dodajemy ich synchronizacją:

- `chance_of_playing_this_round` — bootstrap-static `elements[].chance_of_playing_this_round`
- `news_added` — bootstrap-static `elements[].news_added`

Gdy klucza nie ma, Info pokazuje „—” i nazwę brakującej kolumny. Gdy kolumna się pojawi w `select *`, UI ją pokaże bez kolejnej zmiany wzoru.

## Nazwy

Przełącznik „Nazwy: Opisowe / Skróty” w nagłówku Stats Lab i przy kryteriach Studio. Domyślnie opisowe. Skróty są w `lib/stats-lab/metricNameMode.ts` (rozszerzenie słownika U9). Wybór: `localStorage` `fpl-arena-stats-lab-metric-names`. Pełna nazwa zostaje w `title`. Wykres „Passy i regularność” bez zmian etykiet poza tym słownikiem, którego nie używa. Venn w trybie opisowym zostaje przy dotychczasowych zdaniach.

## Predykcje piłkarzy

Plan: `docs/stats-lab/predykcje-pilkarzy-plan.md`. W Predykcjach przełącznik „Kluby / Piłkarze”. Tabela bierze xPts, p60, minuty i FDR z istniejącego silnika. Szansa na gola i asystę to „—”, bo silnik nie zwraca tych prawdopodobieństw. Czyste konto: `csPct` meczu, tylko GK i DEF.

Logika filtra i sortu: `queryPlayerProjectionTable`. Odczyt: `queryStatsLabPlayerProjectionsAction` (sam `select`, po sesji admina).
