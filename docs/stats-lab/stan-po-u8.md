# Stats Lab — stan po U5c–U8

Moduły Centre, Studio, Predykcje i Planer są aktywne. Bez zmian zostaje tylko „Baza i Synchronizacja FPL” (`/admin/stats-lab/sync`). Geometria starszych wykresów zostaje kontraktem wyglądu.

## U5c

- Stats Centre rozróżnia ładowanie, błąd i pustą pulę (0 wierszy dopiero po odpowiedzi).
- Motyw Light: kontrast kontrolek liczony z prawdziwych kolorów, nie tylko z tokenów.

## U6 / U6b

- Karta zawodnika Planera na boisku, ławce i plakacie: pełne nazwisko w aria, kropki FDR, wąska odznaka.
- Panel admina poniżej 768 px jest zwijany (przycisk menu, szuflada). Od 768 px zostaje w układzie.

## U7

- Ikony karty (sprzedaż, zmiana) są poza koszulką i mają pełną nazwę w `aria-label`.
- W Studio skrót na wykresie (np. xG) ma pełną nazwę w `title` i `aria-label`.

## U8 — diagram Venna

Siódmy tryb Studio: `VENN_3`. Trzy warunki (metryka ≥ próg) i wspólny zakres kolejek.

- Domyślny preset „Kompletny obrońca”: obrońcy, min. 270 minut, 4+ czyste konta, 3+ gole i asysty, 4+ mecze z progiem DefCon (`dc_bonus_matches`: obrońca CBI+wślizgi ≥ 10).
- Kolejne presety: pomocnicy (G+A, xGI, bonus), napastnicy (gole, xG, bonus), bramkarze (CS, obrony, bonus). W panelu można wybrać własne 3 metryki i progi.
- Progi czytają sumy okresu, nie Per 90. Pula filtra nie jest cięta do Top N.
- Plan: [`studio-venn-plan.md`](./studio-venn-plan.md).

DefCon jest w danych jako liczba meczów z progiem, nie jako osobna flaga „kolejka”. W podwójnej kolejce mogą być dwa mecze. Brak historii GW zostawia tę metrykę na 0.
