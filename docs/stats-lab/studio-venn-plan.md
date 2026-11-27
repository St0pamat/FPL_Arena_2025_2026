# Studio — diagram Venna (3 warunki)

Wygląd to nadal trzy nachodzące koła i siedem pól. Środek = wszystkie warunki. Grafika zostaje w tokenach Studio (Arena / Scout / Light).

## Wybór zawodników (jak Profil wielowymiarowy)

Ta sama sekcja „Wybór zawodników”:

- ręcznie: wyszukiwarka i lista zaznaczeń, maks. 20;
- automatycznie: „Pokaż najlepszych (Top N)” — Top 3 / 5 / 8 / 10 / 15 / 20.

Na diagramie są tylko ci zawodnicy. Nie ma „+N więcej” ani listy setek graczy. Pod spodem jest krótka legenda wybranych (pole i wartości). Każdy wybrany ma pełne nazwisko z FPL i herb.

Przełącznik „3 / 5 / 8 / Wszyscy” przy wykresie jest zdjęty — zastępuje go Top N.

## Trzy kryteria

Po zmianie pozycji (GK / DEF / MID / FWD) wracają domyślne progi tej pozycji. Użytkownik może dla każdego koła wybrać dowolną metrykę z puli Studio i dowolny próg. „Wszystkie” nie zeruje własnych progów.

| Pozycja | Koło A | Koło B | Koło C |
|---|---|---|---|
| GK | 3+ czyste konta | 20+ obron | 2+ bonus |
| DEF | 4+ czyste konta | 3+ gole i asysty | 4+ mecze z progiem DefCon (+2) |
| MID | 3+ gole i asysty | 3+ xGI | 4+ bonus |
| FWD | 4+ gole | 3+ xG | 3+ bonus |

Progi czytają sumy okresu (`rawValues`), nie Per 90 i nie percentyle.

## Sortowanie TOP N

1. liczba spełnionych warunków (0–3),
2. punkty FPL,
3. id.

Opis pod wykresem: „Posortowane: liczba spełnionych warunków, potem punkty”. Ręczny wybór zostaje w kolejności zaznaczenia.

Żeby ranking widział całą pulę filtra, zapytanie bez konkretnej listy nadal ustawia `returnAllEligible`. Na płótnie zostaje tylko Top N albo zaznaczeni (maks. 20). Inne wykresy dalej tną Top N w silniku.

## Układ

- Koła: akcent motywu, złoto motywu, błękit z palety metryk. Etykieta przy kole ma pełną nazwę i próg.
- Żeton: herb z `/api/uploads/fpl-lab/badge/…` i pełne nazwisko (bez `truncate` i bez wielokropka). Wartości trzech progów są na żetonie.
- Pusty obszar: „0 graczy” / „0 players”.
- Eksport PNG: kwadrat 1080 px, sam diagram z wybranymi (bez panelu). Żetony są pogrupowane nagłówkiem pola (`A`, `A+B`, `A+B+C`), a pasek żetonu rysuje kolor każdego koła z tego pola. Stopka plakatu jest wspólna z resztą Studio.
- Wąski ekran (320–360): żetony zawijają się w całą szerokość, legenda zostaje pod wykresem.

## Poza zakresem

Brak zapisów do Supabase, brak syncu, brak e2e. Moduł `/admin/stats-lab/sync` bez zmian. Wykres „Passy i regularność” bez zmian. Bez nowych zależności.
