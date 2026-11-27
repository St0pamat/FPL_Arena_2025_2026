# Predykcje piłkarzy — plan (U12)

Krótki plan przed wdrożeniem. Moduł „Baza i Synchronizacja FPL” bez zmian. Brak zapisów, migracji, synchronizacji i e2e na produkcji. Wzory xPts, FDR i Dixona-Colesa bez zmian.

## Przełącznik

W Predykcjach zostaje widok klubów. Obok jest „Kluby / Piłkarze”. Nazwa zakładki Predykcje się nie zmienia.

## Skąd liczby

Tabela czyta ten sam dataset co Planer (`getCachedStatsLabDataset`, tylko `select`) i składa wiersze z istniejących funkcji:

- `buildStatsLabProjections` — mecze, FDR, `csPct` drużyny
- `buildPlannerXPtsContext` + `projectPlayerGw` — xPts, `p60`, przewidywane minuty, rywale
- `sumXPtsOverHorizon` — suma; kolejka bez meczu (BGW) to `null` w komórce i 0 w sumie

Nowych wzorów nie ma.

## Kolumny

| Kolumna | Źródło | Gdy brak |
|---|---|---|
| xPts na 1/3/5/6 najbliższych kolejek | `projectPlayerGw` | BGW: „—” |
| Suma | `sumXPtsOverHorizon` | — |
| Szansa gry (p60) i minuty | `p60`, `expectedMinutes` | BGW: „—” |
| Szansa na gola / asystę | silnik liczy xG/xA tylko wewnątrz xPts i nie zwraca prawdopodobieństwa | „—” + objaśnienie |
| Czyste konto | `csPct` z predykcji meczu, tylko GK i DEF | MID/FWD oraz brak meczu: „—” |
| FDR rywali | `fdrLevel` + ticker z tego samego meczu | BGW: „—” |
| Cena, posiadanie | `now_cost`, `selected_by_percent` | — |
| Status kontuzji | ten sam znacznik co w Planerze | brak flagi = dostępny |

Horyzont liczy się od pierwszej kolejki po ostatniej zakończonej.

## Filtry i widok

Pozycja, klub, cena min/max (dziesiąte funta w logice, £ tylko na ekranie), minimalna szansa gry (p60 najbliższego meczu), wyszukiwarka, ukryj kontuzjowanych / zawieszonych / niedostępnych (`i`, `s`, `u`, `n`). Sortowanie każdej kolumny, TOP N, wybór kolumn. Eksport: obraz tabeli oraz CSV/JSON w „Więcej”. Mobile: filtry się zawijają, tabela przewija się w poziomie, cele mają min. 44 px.

Logika filtra i sortowania jest czystą funkcją, bez Reacta.
