# Studio U8 — diagram Venna (3 warunki)

Plan wdrożenia w tym samym PR. Wygląd wzoru FPL Labs jest tylko typem wykresu: trzy nachodzące koła, siedem pól, środek = wszystkie warunki. Grafika ma zostać w tokenach Studio (Arena / Scout / Light), nie kopią plakatu.

## Co powstaje

Nowy tryb Studio `VENN_3` („Diagram Venna”). Trzy warunki, każdy to metryka + próg `≥ N`. Zakres kolejek, pozycja, min. minut, cena i klub są wspólne z resztą Studio.

Pola: `A`, `B`, `C`, `AB`, `AC`, `BC`, `ABC`. Kto nie spełnia żadnego progu, nie wchodzi do kół. Puste pole pokazuje „nikt” / „nobody”.

## Skąd dane

Tylko odczyt tego, co Studio już agreguje w `rawValues` za wybrany okres (`analyticsEngine`, historia `fpl_lab_player_gw_history`):

| Warunek domyślny | Klucz | Znaczenie |
|---|---|---|
| 4+ czyste konta | `clean_sheets` | suma czystych kont w zakresie GW |
| 3+ gole i asysty | `goals_assists` | gole + asysty |
| 4+ mecze z progiem DefCon | `dc_bonus_matches` | mecze, w których FPL dało +2 za próg DC |

DefCon jest w danych. Dla obrońcy próg to CBI + wślizgi ≥ 10 (dla pomocnika i napastnika CBI + wślizgi + odbiory ≥ 12). `dc_bonus_matches` liczy **mecze**, nie unikalne kolejki: w DGW mogą być dwa hity. Brak osobnej kolumny „kolejka z ≥10 akcjami” poza tym agregatem — nie dodajemy synchronizacji. Gdy historii GW nie ma, metryka zostaje 0 (nie zgadujemy).

Progi czytają **sumy okresu** (`rawValues`), nie Per 90 i nie percentyle. Inaczej „4+ czyste konta” rozjeżdżałoby się przy włączonym Per 90.

Żeby koła objęły całą pulę filtra (a nie Top 10), zapytanie Venna ustawia `returnAllEligible`. Inne wykresy dalej tną do Top N (maks. 50).

## Jak liczymy

Czysta funkcja `assignPlayersToVennRegions` w `lib/stats-lab/vennEngine.ts`:

- wartość brakująca, `null` albo `NaN` → 0;
- próg, który nie jest liczbą → warunek niespełniony;
- wiersze meczowe sumujemy tylko w `[gwFrom, gwTo]`;
- min. minut odrzuca gracza z kół (osobna grupa, nie pole);
- remis rankingu: suma trzech metryk, potem punkty FPL, potem id.

Układ żetonów (`layoutVennRegion`) jest deterministyczny: siatka punktów w polu, prostokąty się nie stykają i nie wychodzą z pola. Nadmiar → najlepsi na kole i żeton „+N”; pełna lista pod wykresem.

## Układ i stany

- Koła: akcent motywu, złoto motywu, błękit z palety metryk Studio. Etykieta przy kole ma pełną nazwę i próg („4+ czyste konta”).
- Żeton: kolor klubu (ta sama paleta co karta Planera) i herb z `/api/uploads/fpl-lab/badge/…`. Nazwisko skrócone znakiem „…” jako tekst, nie klasą `truncate`. Pełne nazwisko w tooltipie, aria i liście.
- Środek: większe żetony i skrót liczb; skrót ma pełną nazwę w aria (jak U7).
- Poniżej 768 px szerokości wykresu: w kołach same liczniki, zawodnicy tylko na liście. Eksport PNG (1120 px) zawsze rysuje żetony i nie zawiera panelu sterowania.
- Nagłówek: tytuł presetu + zdanie z danych. Stopka jak na innych plakatach (`fpl-arena.com`, zakres GW).

## Presety

1. Kompletny obrońca (domyślny): DEF, 270 min, 4 CS, 3 G+A, 4 DC.
2. Pomocnicy: 270 min, 3 G+A, 3 xGI, 4 bonus.
3. Napastnicy: 270 min, 4 gole, 3 xG, 3 bonus.
4. Bramkarze: 270 min, 3 CS, 20 obron, 2 bonus.

W panelu można wybrać dowolne 3 metryki i progi. Preset nie rusza zakresu kolejek, klubów ani ceny.

## Testy

Przydział 7 pól, puste pola, gracz bez minut, progi, zakres GW, brak NaN, ranking i „+N”, brak nachodzenia żetonów, kontrast etykiet w 3 motywach (≥ 4.5:1), PL/EN, eksport bez kontrolek.

## Poza zakresem

Brak zapisów do Supabase, brak syncu, brak e2e. Moduł `/admin/stats-lab/sync` bez zmian. Bez nowych zależności.
