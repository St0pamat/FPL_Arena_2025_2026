# NA MINUSIE ™ - ADMIN PANEL MASTER PLAN (v2.0 - Excel SSOT)

## CEL GŁÓWNY
Panel administracyjny ma być maksymalnie uproszczonym, ale profesjonalnym systemem typu ETL (Extract, Transform, Load). Główne źródło prawdy (SSOT) to zewnętrzny plik Excel organizatora. Aplikacja nie pobiera danych automatycznie z API FPL przed sezonem – opiera się w 100% na wklejanych tabelach.

## ZŁOTE ZASADY DLA AI (CURSOR)
- **KISS (Keep It Simple, Stupid):** Usuń wszelkie skomplikowane kreatory dywizji czy automatyczne fetche z API FPL. Jeśli użytkownik wkleja dane z Excela, ufamy im w 100%.
- **ZASADA STAGINGU:** Wyniki kolejek w Workspace zawsze zapisują się jako `is_published = false`. Strefa Gracza widzi tylko opublikowane dane.
- **BRAK MARTWEGO KODU:** Usuwaj nieużywane pliki i skomplikowane algorytmy, które zostały zastąpione prostym importem z Excela.

## ARCHITEKTURA MODUŁÓW

### MODUŁ 1: Master Import (Inicjalizacja Sezonu)
Jedno potężne pole tekstowe do wklejenia bazy graczy z Excela. Skrypt inteligentnie przetwarza 12 kolumn:
`LP | Piramida | Dywizja | Nazwa dywizji | FPL Team | FPL Manager | FPL ID | OR | Discord Name | Discord Club | Discord ID | Status`
System z tego jednego wklejenia automatycznie:
1. Tworzy brakujące Dywizje (po nazwach i tierach).
2. Tworzy lub aktualizuje Graczy (Teams), przypisując ich do odpowiednich Dywizji.
3. Po imporcie pozwala jednym przyciskiem wygenerować losowy terminarz Bergera dla zaimportowanych dywizji.

### MODUŁ 2: Roster Management
- Tabela wszystkich zaimportowanych graczy.
- Możliwość prostej, ręcznej edycji (CRUD) każdego gracza, usuwania, dezaktywacji (`is_active`).

### MODUŁ 3: Gameweek Workspace (Brudnopis Kolejki)
- Wybór GW1 - GW38.
- Tabela meczów H2H dla danego GW.
- **Ręczny Import GW:** Wklejenie "małych punktów" z Excela. System sam przelicza H2H i Medianę.
- Ręczna korekta punktów z palca.
- Przycisk "Publikuj" (is_published = true).

### MODUŁ 4: Symulator Sezonu (Sandbox)
Potężne narzędzie do testowania logiki frontendowej i przypadków brzegowych.
- **Zakres:** Wybór od GW do GW oraz multiselect Dywizji (z opcją "Zaznacz wszystkie").
- **Tryby losowania (Scenariusze):**
  1. *Standardowy Chaos:* Punkty 30-100.
  2. *Ujemne Punkty:* Punkty od -10 do +30 (testowanie ujemnych wyników i niskiej mediany).
  3. *Stykowa Tabela:* Punkty 50-55 (testowanie tie-breakerów w głównej tabeli).
  4. *Festiwal Remisów:* Wymuszanie identycznych wyników w parach H2H (remisy).
  5. *Test Baraży (GW19/GW38):* Symuluje idealne remisy w meczach barażowych.
- **Akcje:** Generuj (is_published = false), Publikuj, Wyczyść (Undo - resetuje wybrane GW do 0).

### KWESTIA BARAŻY (GW19 i GW38) I REMISÓW
- Jeśli mecz w GW19/GW38 kończy się remisem punktowym FPL, w tabeli `fixtures` musimy uwzględnić dodatkowe pola na Tie-breakery (np. `tiebreaker_winner_id`), które administrator wprowadzi z palca w Edytorze Kolejek (Workspace) na podstawie manualnego sprawdzenia (Gole > Stracone > Ławka).

### MODUŁ 5: Rozliczenie Sezonu i Tranzycja (Sezon Jesień -> Wiosna)
Moduł odpalany tylko po zakończeniu GW19 i GW38.
1. **Archiwizacja:** Zablokowanie edycji Sezonu 1 (Strefa Gracza zachowuje do niego wgląd z poziomu archiwalnego dropdownu).
2. **Kalkulator Awansów/Spadków:** System automatycznie wylicza kto spada, kto awansuje (np. Top 3 i Bottom 3).
3. **Draft Nowego Sezonu:** System tworzy nowy "Sezon Wiosenny (GW20-38)", przypisuje graczy do nowych dywizji.
4. **Korekta Ręczna:** Okienko przed wygenerowaniem terminarza na dodanie nowych graczy z Excela (jeśli ktoś zrezygnował) i wyrzucenie nieaktywnych.
