# Stats Lab — stan po U9

Przegląd UX z 2026-11-20 (128 podpunktów). Moduł „Baza i Synchronizacja FPL” bez zmian. Brak zapisów do Supabase, brak synchronizacji FPL, brak testów e2e na produkcji.

Korekta właściciela do 2.1: zapamiętywanie wcześniej wczytanego składu zostaje. Czysty start (brak zapisanego ID) i przycisk „Skład demo” dają skład, który mieści się w £100.0m.

Wzory xPts, FDR, predykcji i cen bez zmian. 7.1 i 26.4 mają część prezentacyjną; znaczenie modelu zostaje do decyzji analityka.

## Korekta właściciela — Passy i regularność

Wykres Studio „Passy i regularność” wraca do stanu sprzed U9 (`d5ca75f`). Właściciel nie akceptuje zmian z PR #6 (merge `39a2f0a`).

- 18.1 cofnięte: z powrotem siatka kart (jedna na zawodnika, 2 kolumny od `md`), bez tabeli gracz × kolejka i bez „Pokaż więcej”.
- 18.2 cofnięte: z powrotem krótkie nazwy „Seria G/A” / „G/A streak” oraz „Seria DC (+2)” / „DC (+2) streak”.
- Kolor serii DC w ciemnym motywie z powrotem turkus (`#2dd4bf`), osobno od złotego bonusu.
- Na karcie z powrotem „% TSB”. Słownik nazw (POS% / OWN%) zostaje.
- Stopka eksportu zostaje wspólna i nowa: „fpl-arena.com · Dane: FPL · Predykcje: FPL Arena”.
- Reszta U9 (inne wykresy, Planer, Centre, Predykcje, Venn, akcent Scout) bez zmian.

## Do decyzji analityka

| Numer | Co jest na ekranie | Czego nie ruszano |
|---|---|---|
| 7.1 | Linia minut mówi „Szansa na krótkie wejście” i pokazuje `p1` z silnika. | W silniku `p1` to krótkie wejście, a brak występu to `p0 = 1 − p60 − p1`. Nie zmieniano wzoru. |
| 26.4 | Data bez sekund: „Zaktualizowano …” / „Updated …”. | Nie oceniano, czy prognoza powinna być nowsza. |

## P0

| Numer | Status | Powód |
|---|---|---|
| 2.1 | zrobione | Pamięć składu zostaje. Widać, czyj skład jest wczytany, i da się wrócić do demo albo wpisać inne ID. |
| 2.2 | zrobione | Demo mieści się w £100.0m. Bank ≥ £0.0m. |
| 6.1 | zrobione | „i” w rynku otwiera to samo okno Info co nazwisko na boisku. |
| 6.2 | zrobione | „3 GW” jest pod xPts. Tabela nie ma minimalnej szerokości 420 px. |
| 11.1 | zrobione | Fraza wyszukiwania ma własny komunikat i przycisk „Wyczyść”. |
| 1.1 | zrobione | Przełącznik 3/5/8/Wszyscy, domyślnie 5. Nadmiar: „+N więcej”. |
| 1.2 | zrobione | Herb 24 px, nazwa 14 px / 600, chip min. 32 px, odstęp 6 px. |
| 1.3 | zrobione | `web_name`. Wielokropek dopiero powyżej 14 znaków. |
| 1.4 | zrobione | PNG Venna jest kwadratem. Lista tylko po „Dołącz listę zawodników”. |
| 23.1 | zrobione | „(D) – u siebie · (W) – na wyjeździe” / „(H) – home · (A) – away”. |
| 29.1 | zrobione | Rząd boiska dzieli szerokość. Na wąskiej karcie cena jest ukryta. |

## P1

| Numer | Status | Powód |
|---|---|---|
| 1.5 | zrobione | Wejście w Venna czyści poprzedni wynik i pokazuje „Liczę…”. |
| 1.6 | zrobione | Tytuły przy kołach, w kolorze koła. |
| 1.7 | zrobione | Środek: karta „Spełnia wszystkie 3”. |
| 1.8 | zrobione | Limity wizualne. Reszta jako „+N”. |
| 1.9 | zrobione | Poniżej 640 px lista obszarów i miniatura. |
| 1.10 | zrobione | Lista używa `web_name`. |
| 3.1 | zrobione | Plakat to sam obraz. JSON jest w „Więcej”. |
| 3.2 | zrobione | ⚠ na GW ma `title` i dopisek w `aria-label`. |
| 3.3 | zrobione | „Darmowe transfery (GW…)”. |
| 3.4 | zrobione | Pigułka „Wartość składu”. |
| 5.1 | zrobione | Baner transferu: „cena sprzedaży”, bez „SP”. |
| 5.2 | zrobione | Pigułka „Skład £X · Bank £Y”. |
| 5.3 | zrobione | „Bank po sprzedaży”. |
| 5.4 | zrobione | Przy przeliczaniu widać „Przeliczam…”. |
| 8.1 | zrobione | Po włączeniu chipa pasek z „Cofnij” na 5 s. |
| 4.1 | zrobione | Kropki FDR 8 px z obwódką. |
| 4.2 | zrobione | Tooltip „Następne 3 mecze” i legenda pod boiskiem. |
| 10.1 | zrobione | Nagłówek kolumny ma pełną nazwę w `title`. |
| 10.2 | zrobione | Pięć odcieni skali w ciemnym motywie. Progi liczb bez zmian. |
| 11.2 | zrobione | Plakietka „Per 90” podaje próg minut i liczbę wierszy. |
| 11.3 | zrobione | „Suma” / „Na 90 min”. |
| 12.1 | zrobione | Dla klubów przycisk mówi „Na mecz”. Dzielenie przez mecze było już w silniku. |
| 14.1 | zrobione | Główny przycisk to obraz. JSON jest w „Więcej”. |
| 15.1 | zrobione | Panel metryk pokazuje nazwy. Kod zostaje w `title`. |
| 15.2 | zrobione | Zakładki po polsku. W tabeli: zagrożenie, kreatywność, wpływ, wartość. |
| 15.3 | zrobione | „Ocena na tle grupy (0–100)” / „Surowe liczby”. |
| 15.4 | zrobione | Szkielet na całą ramkę i napis „Ładuję dane…”. |
| 16.1 | zrobione | Jedna legenda nad profilem. Szczegół metryki w tooltipie segmentu. |
| 16.2 | zrobione | W segmencie ocena 0–100. Zdanie „Długość = ocena na tle grupy”. Surowa liczba w tooltipie. |
| 18.1 | cofnięte | Decyzja właściciela: z powrotem siatka kart, bez tabeli i „Pokaż więcej”. |
| 20.1 | zrobione | Na karcie nazwa metryki może się zawinąć. Liczba zostaje w całości. |
| 21.1 | zrobione | Podtytuł używa krótkiego „grupa: N”. |
| 22.1 | zrobione | Dwa przyciski, „Udostępnij” i „Więcej”. |
| 22.2 | zrobione | Poniżej 640 px eksport jest pod wykresem. |
| 23.2 | zrobione | Pięć różnych kolorów FDR w ciemnym motywie. Skala liczb bez zmian. |
| 23.3 | zrobione | Cień prawej krawędzi i znak „→”. |
| 24.1 | zrobione | Liczba w komórce 14 px, herb mniejszy od liczby. |
| 26.1 | zrobione | Dwie kolumny: CS i 2+ gole przy gospodarzu i przy gościu. |
| 26.2 | zrobione | Herb karty 40 px. Opis paska 12 px. |
| 30.1 | zrobione | Zanim przyjdą dane, zakres to „Ładuję dane…”, bez „Sezon: —”. Bieżącej GW nie zgadywano. |
| 27.1 | zrobione | W Light panel boczny Stats Lab ma jasne tło. |
| 29.2 | zrobione | Strzałki GW i pigułki mają min. 44 px. |
| 29.3 | zrobione | Tabela Centre ma cień krawędzi i „→ przewiń”. |
| 29.4 | zrobione | Nowe cele i zakładki Predykcji mają min. 44 px wysokości. |
| 29.5 | zrobione | Na wąskim ekranie kontrolki FDR chowają się pod „Ustawienia”. |
| 29.6 | zrobione | Baner zgodności zawija tekst. |
| 32.1 | zrobione | Stopka „fpl-arena.com · Dane: FPL · Predykcje: FPL Arena”. |

## P2

| Numer | Status | Powód |
|---|---|---|
| 1.11 | zrobione | Frazy G+A i premii DC. |
| 1.12 | zrobione | „0 graczy”. |
| 1.13 | zrobione | Przy Vennie presety są wyłączone i jest dopisek „Nie dotyczy diagramu Venna”. |
| 1.14 | zrobione | Legenda trzech warunków. |
| 2.5 | zrobione | „Skład demo · wpisz swoje ID FPL…”. |
| 3.5 | zrobione | „Koszt transferów”. |
| 3.6 | zrobione | Termin w jednej linii. Rozwinięcie pokazuje cztery kafelki. |
| 3.7 | zrobione | „Liczba na karcie”. |
| 4.3 | zrobione | Legenda boiska. |
| 4.4 | zrobione | Obrys tylko przy `:focus-visible`. |
| 5.5 | zrobione | Logika banku po transferze bez zmian. Zostają testy. |
| 6.3 | zrobione | Posiadanie % / POS%. |
| 6.4 | zrobione | Jedna nazwa: akcje obronne (DC). |
| 6.5 | zrobione | „Obserwowani”. |
| 7.1 | do decyzji analityka | Patrz tabela na górze. |
| 7.2 | zrobione | Zdanie o xPts. |
| 7.3 | zrobione | „Symuluj zmianę ceny”. |
| 7.4 | zrobione | „Obserwuj” / „Watch”. |
| 8.2 | zrobione | Przy chipie jest polski dopisek. Nazwa FPL zostaje. |
| 9.1 | zrobione | W widoku plakatu panel sterowania jest ukryty. Jest „Wróć do edycji”. |
| 9.2 | zrobione | Demo nie startuje z ujemnym bankiem. |
| 10.3 | zrobione | „BPS – system punktów bonusowych”. |
| 10.4 | zrobione | Nagłówek „Cena”. |
| 11.4 | zrobione | Dwa miejsca po przecinku także dla hauli, występów i Dream Teamu. |
| 11.5 | zrobione | „Obserwowani”. |
| 12.2 | zrobione | Placeholder wyszukiwania klubów. |
| 12.3 | zrobione | M, GC i punkty DC mają pełną nazwę w `title`. |
| 13.1 | zrobione | „Rywal” / „Opp.” i „±xGI”. Pełna nazwa różnicy xGI jest w etykiecie. |
| 13.2 | zrobione | „Każdy mecz” / „Suma”. |
| 14.2 | zrobione | „Pobierz obraz tabeli”. |
| 15.5 | zrobione | „Ukryte perełki (posiadanie ≤10%, dobra cena)”. |
| 15.6 | zrobione | Przy liczniku grupy jest „(min. N min)”. |
| 16.3 | zrobione | „Ocena profilu 60/100”, 12 px. |
| 17.1 | zrobione | Legenda: „Występ”, „60+ min”, „Bonus”. Skrót w wierszu ma tooltip. |
| 17.2 | zrobione | „Pokaż punkty ujemne”. |
| 17.3 | zrobione | „Zdobyte” / „Odjęte”. |
| 18.2 | cofnięte | Decyzja właściciela: „Seria G/A” i „Seria DC (+2)”. |
| 19.1 | zrobione | Osie: Punkty, Czyste konta, Akcje obr., Pkt z DC, Mecze z DC, xGI, Bonus BPS. |
| 19.2 | zrobione | „Porównaj do 4 graczy (nie trafia do PNG)”. |
| 19.3 | zrobione | Zakładka „Radar”. |
| 20.2 | zrobione | „Najlepsi w obu”, „Dużo”, „Poniżej średniej”. |
| 20.3 | zrobione | „Wykres punktowy”. |
| 21.2 | zrobione | „Mapa cieplna”. |
| 21.3 | zrobione | Stopka płótna Studio jest tą samą stopką co na plakacie. |
| 22.3 | zrobione | „Pobierz obraz (PNG)”. |
| 23.4 | zrobione | „×” ma tooltip „Ukryj kolejkę”. |
| 23.5 | zrobione | „Własny podpis”, „Co pokazać w komórce”, „Wygląd komórki”. |
| 23.6 | zrobione | Nagłówki średniej FDR i oczekiwanych CS mają zdanie w `title`, z odesłaniem do Bazy Wiedzy. |
| 24.2 | zrobione | „Najlepsze ataki w najbliższych 6 kolejkach”. |
| 25.1 | zrobione | „Szansa na czyste konto (%)”. |
| 25.2 | zrobione | „Oczekiwane czyste konta (zakres GW)”. |
| 26.3 | zrobione | „Remis” i „Wygrana” przy procencie. |
| 26.4 | do decyzji analityka | Patrz tabela na górze. Format daty jest bez sekund. |
| 26.5 | zrobione | „Siatka meczów”, „Prognoza a wynik”. |
| 27.2 | zrobione | Akcent Scout to złoto. Koło A Venna zostaje turkusowe. |
| 27.3 | zrobione | Kolory chipów Venna bez zmian. Rozmiar według 1.2. |
| 28.1 | zrobione | EN menu Stats Lab. |
| 28.2 | zrobione | EN: „4+ matches with DC bonus (+2)”. |
| 28.3 | zrobione | „Tabele statystyk”. Opis ETL usunięty. |
| 28.4 | zrobione | PL bez TSB, GKP, Totals i angielskich nazw zakładek. |
| 30.2 | zrobione | Planer, Tabele, Studio i Predykcje pokazują szkielet i „Ładuję dane…”. |
| 31.1 | zrobione | POS% / OWN%. |
| 31.2 | zrobione | BR / GK. |
| 31.3 | zrobione | PKT / PTS. |
| 31.4 | zrobione | Akcje obronne (DC), Punkty z DC, Mecze z premią DC. |
| 31.5 | zrobione | „Tabele” / „Wykresy”. |
| 32.2 | zrobione | Przyciski obrazu mówią „Pobierz obraz”. |
| 32.3 | zrobione | JSON jest w „Więcej → Dane techniczne”. |

## Czego nie ruszano

- `/admin/stats-lab/sync` i silnik synchronizacji.
- Zapisów, migracji i odczytów produkcyjnej bazy w testach.
- Wzorów xPts, FDR, predykcji i cen.
