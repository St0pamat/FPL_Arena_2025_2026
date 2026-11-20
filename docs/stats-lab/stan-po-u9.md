# Stats Lab — stan po U9

Przegląd UX z 2026-11-20 (128 podpunktów). Moduł „Baza i Synchronizacja FPL” bez zmian. Brak zapisów do Supabase, brak synchronizacji FPL, brak testów e2e na produkcji.

Korekta właściciela do 2.1: zapamiętywanie wcześniej wczytanego składu zostaje. Czysty start (brak zapisanego ID) i przycisk „Skład demo” dają skład, który mieści się w £100.0m.

## P0

| Numer | Status | Powód |
|---|---|---|
| 2.1 | zrobione | Pamięć składu zostaje (korekta). Widać, czyj skład jest wczytany, i da się wrócić do demo albo wpisać inne ID. |
| 2.2 | zrobione | Demo dobiera 15 graczy w budżecie £100.0m. Bank ≥ £0.0m, bez ręcznej korekty zapisanej pod ID 0. |
| 6.1 | zrobione | „i” w rynku otwiera to samo okno Info co nazwisko na boisku. |
| 6.2 | zrobione | „3 GW” jest pod xPts. Tabela nie ma minimalnej szerokości 420 px. |
| 11.1 | zrobione | Fraza wyszukiwania ma własny komunikat i przycisk „Wyczyść”. Pusty filtr minut zostaje przy komunikacie o minutach. |
| 1.1 | zrobione | Przełącznik 3/5/8/Wszyscy, domyślnie 5. Nadmiar: „+N więcej”. |
| 1.2 | zrobione | Herb 24 px, nazwa 14 px / 600, chip min. 32 px, odstęp 6 px. |
| 1.3 | zrobione | Na chipie i na liście jest `web_name`. Wielokropek dopiero powyżej 14 znaków. |
| 1.4 | zrobione | PNG Venna jest kwadratem (ramka 1080, skala 2 → 2160). Lista tylko po „Dołącz listę zawodników”. |
| 23.1 | zrobione | Wspólna legenda: „(D) – u siebie · (W) – na wyjeździe” / „(H) – home · (A) – away”. |
| 29.1 | zrobione | Rząd boiska dzieli szerokość (`minmax(0, 1fr)`, karta max 6.5rem). Na wąskiej karcie cena jest ukryta. Tytuł planu łamie wiersz. |

## P1

| Numer | Status | Powód |
|---|---|---|
| 1.5 | zrobione | Wejście w Venna czyści poprzedni wynik i pokazuje „Liczę…”. |
| 1.6 | zrobione | Tytuły przy kołach, w kolorze koła. |
| 1.7 | zrobione | Środek: karta „Spełnia wszystkie 3”, jedna linia, min. 12 px. |
| 1.8 | zrobione | Limity wizualne i margines od obwodu. Reszta jako „+N”. |
| 1.9 | zrobione | Poniżej 640 px lista obszarów i miniatura diagramu. |
| 1.10 | zrobione | Lista używa `web_name`. Pełne nazwisko jest w `title`. |
| 3.1 | częściowo | Teksty „Pobierz plakat” i „Dane techniczne (.json)” są w słowniku. Przycisk nadal może oddawać parę JPG+JSON, dopóki menu „Więcej” nie przejmie audytu. |
| 3.2 | zrobione | ⚠ na GW ma `title` i dopisek w `aria-label`. |
| 3.3 | zrobione | „Darmowe transfery (GW…)” / „Free transfers (GW…)”. |
| 3.4 | zrobione | Pigułka „Wartość składu” z opisem cen sprzedaży. |
| 5.1 | zrobione | Baner transferu: „cena sprzedaży”, bez „SP”. |
| 5.2 | częściowo | Plakat mówi „Wartość drużyny (skład + bank)”. Osobna para „Skład £X · Bank £Y” nie zastąpiła jeszcze wszystkich liczników na żywo. |
| 5.3 | zrobione | Przy wyborze zastępcy widać „Bank po sprzedaży”. |
| 5.4 | częściowo | Zmiana składu jest lokalna (bez czekania na serwer). Brak osobnego napisu „Przeliczam…” przy ciężkim przeliczeniu. |
| 8.1 | częściowo | Tekst paska „Cofnij” jest w słowniku. Pasek na 5 s po chipie nie jest jeszcze podpięty. |
| 4.1 | zrobione | Kropki FDR 8 px (7 px na wąskiej karcie) z obwódką 1 px. |
| 4.2 | zrobione | Tooltip „Następne 3 mecze” i linia legendy pod boiskiem. |
| 10.1 | częściowo | Pełne nazwy kolumn są w legendzie pod tabelą. Nie każdy nagłówek ma własny tooltip. |
| 10.2 | pominięte | Skala 5 odcieni w Arena/Scout wymaga osobnej palety komórek. Nie zmieniano liczb ani progów koloru, żeby nie ruszyć odczytu tabeli. |
| 11.2 | pominięte | Plakietka „Per 90: … z …” potrzebuje dwóch liczników puli w widoku. Progu nie zmieniano po cichu inaczej niż dotychczas. |
| 11.3 | zrobione | „Suma” / „Totals” oraz „Na 90 min” / „Per 90”. |
| 12.1 | pominięte | „Na mecz” dla klubów zmienia sposób dzielenia. Bez osobnej ścieżki liczb nie podmieniano etykiety na inną matematykę. |
| 14.1 | częściowo | Stopka eksportu Centre jest nowa. Główny przycisk nadal może być parą JPG+JSON. |
| 15.1 | częściowo | Część kodów metryk zostaje w tooltipie. Nie zdjęto wszystkich nawiasów z panelu Studio. |
| 15.2 | częściowo | Zakładki: „Wykres punktowy”, „Radar”, „Mapa cieplna”. Nie każdy angielski wtręt w panelu presetów jest podmieniony. |
| 15.3 | pominięte | Przełącznik skali profilu nie dostał nowej pary nazw w tym przebiegu. |
| 15.4 | częściowo | Venn ma szkielet „Liczę…”. Pozostałe wykresy Studio nadal używają dotychczasowego wskaźnika. |
| 16.1 | pominięte | Jedna legenda nad profilem wymaga przebudowy wierszy. Układ pasków zostaje. |
| 16.2 | pominięte | Segmenty nadal niosą dotychczasowe liczby. Nie zmieniano skali 0–100 w segmencie. |
| 18.1 | pominięte | Passy zostają kartami. Tabela TOP 10 to osobny układ, nie skrót tekstu. |
| 20.1 | pominięte | Karty pod wykresem punktowym nie były przebudowane. |
| 21.1 | pominięte | Podtytuł eksportu mapy cieplnej nie był skracany w tym przebiegu. |
| 22.1 | częściowo | Słownik ma „Więcej” i dane techniczne. Sześć przycisków Studio nie jest zwinięte w dwa plus menu. |
| 22.2 | pominięte | Eksport Studio na mobile nie został przeniesiony pod wykres. |
| 23.2 | pominięte | Pięć kolorów FDR w ciemnych motywach nie było rozdzielane poza istniejącą skalą. |
| 23.3 | pominięte | Brak cienia i strzałki przy uciętej kolumnie GW. |
| 24.1 | pominięte | Rozmiar liczb w predykcji goli bez zmian. |
| 26.1 | pominięte | CS i 2+ gole nie są rozbite na kolumny gospodarza i gościa. |
| 26.2 | pominięte | Herby karty meczu i opisy paska bez nowej skali 40 px / 12 px. |
| 30.1 | pominięte | Pierwsza klatka FDR może nadal pokazać zakres zanim przyjdą dane. Nie zgadywano bieżącej GW. |
| 27.1 | zrobione | W Light, na stronach Stats Lab, boczny panel ma jasne tło i ciemny tekst. |
| 29.2 | zrobione | Strzałki GW bez tekstu poniżej 420 px. Pigułka GW min. 64 px i 44 px wysokości. |
| 29.3 | pominięte | Sygnał przewijania tabeli Centre na 320 px nie został dodany. |
| 29.4 | częściowo | Język, motyw, baza wiedzy, filtry pozycji i pigułki GW mają min. 44 px. Nie każdy stary przycisk w Predykcjach. |
| 29.5 | pominięte | Kontrolki FDR nie są zwinięte w „Ustawienia”. |
| 29.6 | częściowo | Panel zgodności jest w kolumnie `min-w-0`. Nie sprawdzono zawijania na żywym 320 px. |
| 32.1 | zrobione | Stopki Centre, Studio, Predykcji i JSON Discord używają „fpl-arena.com · Dane: FPL · Predykcje: FPL Arena”. |

## P2

| Numer | Status | Powód |
|---|---|---|
| 1.11 | zrobione | Frazy G+A i premii DC w warunkach Venna. |
| 1.12 | zrobione | „0 graczy” / „0 players”. |
| 1.13 | częściowo | Tekst „Nie dotyczy diagramu Venna” jest w słowniku. Górny pasek presetów nie jest jeszcze wyszarzony. |
| 1.14 | zrobione | Legenda: „Czyste konta · Gole i asysty · Mecze z premią DC”. |
| 2.5 | zrobione | „Skład demo · wpisz swoje ID FPL…”. |
| 3.5 | zrobione | „Koszt transferów” / „Transfer cost”. |
| 3.6 | pominięte | Odliczanie zostaje w dotychczasowych kafelkach. |
| 3.7 | zrobione | „Liczba na karcie” / „Number on card”. |
| 4.3 | zrobione | Stała legenda „(D) u siebie · (W) wyjazd” pod boiskiem. |
| 4.4 | zrobione | Obrys nazwiska tylko przy `:focus-visible`. |
| 5.5 | zrobione | Bez zmian logiki banku po transferze. Zostają istniejące testy. |
| 6.3 | zrobione | „Posiadanie %” / „Owned %”, skrót kolumny POS% / OWN%. |
| 6.4 | częściowo | Słownik DC jest w tekstach Venna i bazy wiedzy. Nie każda lista sortowania ma już jedną nazwę. |
| 6.5 | częściowo | Planer zostaje przy „Obserwowani”. Centre nie wszędzie ma tę samą etykietę zamiast „Ulubieni”. |
| 7.1 | częściowo | Linia minut jest po polsku i angielsku. Trzecia liczba to `p1` z istniejącego modelu (krótkie wejście, nie brak występu). Brak występu w modelu to `p0`. Do potwierdzenia przez Adama, zanim podmienimy znaczenie. |
| 7.2 | zrobione | „Przewidywane punkty (xPts) w GW…” plus jedno zdanie. |
| 7.3 | zrobione | „Symuluj zmianę ceny: −£0.1m / +£0.1m”. |
| 7.4 | zrobione | Przy gwiazdce jest „Obserwuj” / „Watch”. |
| 8.2 | pominięte | Chipy zostają przy nazwach FPL. Polskie dopiski „kapitan ×3” itd. nie są jeszcze przy przyciskach. |
| 9.1 | pominięte | Widok plakatu nadal pokazuje panel sterowania. |
| 9.2 | zrobione | Skład demo nie startuje z ujemnym bankiem, więc plakat demo też nie. |
| 10.3 | pominięte | Legenda BPS po angielsku w PL nie była podmieniana. |
| 10.4 | pominięte | Nagłówek „£M” bez zmian. |
| 11.4 | pominięte | Format dwóch miejsc w Per 90 bez zmian, żeby nie ruszyć liczb. |
| 11.5 | częściowo | Spójne z 6.5. Etykieta Centre nie wszędzie brzmi „Obserwowani”. |
| 12.2 | pominięte | Placeholder wyszukiwania klubów bez zmian. |
| 12.3 | pominięte | Tooltipy M / GC / DC PKT bez zmian. |
| 13.1 | pominięte | Nagłówki OPP i ΔxGI bez zmian. |
| 13.2 | pominięte | „Pojedyncze mecze” bez przełącznika dwóch stanów. |
| 14.2 | częściowo | Docelowa nazwa jest w słowniku. Przycisk na stronie może nadal brzmieć po staremu. |
| 15.5 | pominięte | Nazwa presetu „Ukryte perełki” bez nowego dopisku. |
| 15.6 | pominięte | Brak dopisku minut przy liczniku grupy porównawczej. |
| 16.3 | pominięte | Waga „Ocena” na profilu bez zmian. |
| 17.1 | pominięte | Skróty WYS / 60+ / BON w legendzie bez zmian. |
| 17.2 | pominięte | Etykieta punktów ujemnych bez zmian. |
| 17.3 | pominięte | „Brutto / Kary” bez zmian. |
| 18.2 | pominięte | Nazwy serii bez zmian. |
| 19.1 | pominięte | Osie radaru nadal mogą pokazywać kody. |
| 19.2 | pominięte | Podpis slotów radaru bez zmian. |
| 19.3 | zrobione | Zakładka „Radar”. |
| 20.2 | pominięte | Narożniki wykresu punktowego bez nowych nazw. |
| 20.3 | zrobione | Zakładka „Wykres punktowy” / „Scatter plot”. |
| 21.2 | zrobione | Zakładka „Mapa cieplna” / „Heatmap”. |
| 21.3 | częściowo | Stopka płótna Studio jest nowa. Osobny napis w eksporcie mapy, jeśli nie idzie przez to płótno, zostaje do kontroli na PNG. |
| 22.3 | częściowo | Docelowa nazwa jest w słowniku. Przycisk może nadal mówić „PNG (HD)”. |
| 23.4 | pominięte | „×” przy kolumnie GW bez tooltipu. |
| 23.5 | pominięte | Nazwy kontrolek FDR bez zmian. |
| 23.6 | pominięte | Brak ⓘ przy xPts i średniej FDR. |
| 24.2 | pominięte | Pigułka „Top ataki” bez nowego tytułu sekcji. |
| 25.1 | pominięte | Tytuł czystych kont bez ujednolicenia. |
| 25.2 | pominięte | „Suma CS” bez nowej nazwy. |
| 26.3 | pominięte | „X (Remis)” bez zmian. |
| 26.4 | pominięte | Format daty aktualizacji bez zmian. Nie oceniano, czy prognoza powinna być nowsza — to do Adama. |
| 26.5 | pominięte | Nazwy trybów kart meczowych bez zmian. |
| 27.2 | zrobione | Akcent Scout to złoto `#f59e0b` (przyciski, nagłówki tokenu). Koło A Venna zostaje turkusowe, żeby nie zlewało się ze złotym kołem B. |
| 27.3 | zrobione | Kolory chipów Venna bez zmian. Rozmiar według 1.2. |
| 28.1 | zrobione | EN menu: „Stats Centre (Tables)”, „Chart Studio”, „Player comparisons”, „FPL Data & Sync”. |
| 28.2 | zrobione | EN: „4+ matches with DC bonus (+2)”. |
| 28.3 | zrobione | Podpowiedź „Tabele statystyk” / „Stats tables”. Opis ETL usunięty. |
| 28.4 | częściowo | Zdjęte widoczne TSB, GKP w PL, Scatter 2D, Totals (Suma). Nie każdy panel Studio przeszedł pełny przegląd angielskich wtrętów. |
| 30.2 | częściowo | Venn używa szkieletu. Pozostałe moduły zostają przy dotychczasowym ładowaniu. |
| 31.1 | zrobione | Posiadanie % / Owned %, skróty POS% / OWN%. |
| 31.2 | częściowo | Bramkarz w Planerze i bazie wiedzy: BR / GK. Nie każda stara etykieta GKP w Studio jest podmieniona. |
| 31.3 | częściowo | Pełna nazwa punktów jest w części metryk. Skrót TP na osiach nie wszędzie jest PKT. |
| 31.4 | częściowo | Venn i baza wiedzy używają trzech nazw DC. Nie każda kolumna Centre. |
| 31.5 | zrobione | Górny pasek: „Tabele” / „Tables” i „Wykresy” / „Charts”. Menu EN według 28.1. |
| 32.2 | częściowo | Nowe przyciski mają mówić „Pobierz obraz”. Stare przyciski JPG/PNG nie są ujednolicone. |
| 32.3 | częściowo | Słownik przewiduje JSON w „Więcej”. Nie każde miejsce eksportu jest już schowane. |

## Czego nie ruszano

- `/admin/stats-lab/sync` i silnik synchronizacji.
- Zapisów, migracji i odczytów produkcyjnej bazy w testach.
- Liczb xPts, FDR i cen poza doborem składu demo (to skład przykładowy, nie prognoza).
