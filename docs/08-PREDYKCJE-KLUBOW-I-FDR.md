# Predykcje Klubów i Kalendarz FDR — inwentaryzacja i plan modułu

| Pole | Wartość |
|------|---------|
| Moduł docelowy | `PROJECTIONS_CENTRE` / `TEAM_PROJECTIONS` (`FIXTURE_TICKER`) |
| Status dokumentu | **Plan / inwentaryzacja + specyfikacja silnika Dixona-Colesa v0.2** (moduł jeszcze niezaimplementowany) |
| Status kodu | **Zero-Regression:** Chart Studio 6/6 + Stats Centre 13/13 = **FROZEN** |
| Silnik docelowy | `lib/stats-lab/projectionsEngine.ts` — **Dixon-Coles v0.2** |
| Cel | Social-First AAA: FDR, projected goals, CS%, karty meczowe, eksport X/Discord |

Powiązane: [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) · [`07-STATS-CENTRE.md`](./07-STATS-CENTRE.md) · Chart Studio docs/03–06.

**Ten dokument nie zmienia zamrożonego kodu.** Opisuje stan danych, plan wpięcia nowego wątku Stats Lab oraz pełną specyfikację matematyki i UX (sekcje 6–7).

---

## 1. Stan danych: Fixtures, kluby, sync FPL

### 1.1 Werdykt: brak tabeli przyszłych meczów FPL w Stats Lab

W przestrzeni `fpl_lab_*` **nie istnieje** tabela `fpl_lab_fixtures` (ani inna tabela z pełnym terminarzem GW1–GW38 / przyszłymi spotkaniami PL).

Wyszukiwanie w migracjach SQL i `lib/stats-lab/` nie znajduje:

- `fpl_lab_fixtures`,
- mapowania `strength_overall_home/away`, `strength_attack_*`, `strength_defence_*`,
- wywołań oficjalnego endpointu `https://fantasy.premierleague.com/api/fixtures/`.

Tabela `public.fixtures` w projekcie należy do **The FA League / H2H** (liga menedżerska), **nie** do terminarza Premier League FPL — nie wolno jej mylić z FDR PL.

### 1.2 Tabele Stats Lab dziś (migracje)

Źródła:

- `supabase/migrations/20261106120000_create_fpl_stats_lab.sql`
- `supabase/migrations/20261106150000_expand_fpl_stats_lab_full.sql`
- typy: `lib/stats-lab/types.ts`
- sync: `lib/stats-lab/syncEngine.ts`

#### `fpl_lab_clubs`

| Kolumna | Opis |
|---------|------|
| `season_code` | PK składany |
| `fpl_team_id` | 1–20 (ID zespołu FPL) |
| `pulse_code` | kod herbu / media |
| `name`, `short_name` | nazwa pełna / skrót |
| `strength` | **jedna** skalarna siła z `bootstrap-static.teams.strength` (nullable) |
| `primary_color` | obecnie sync ustawia `null` |
| `updated_at` | timestamp |

**Brak w bazie / syncu:** `strength_overall_home`, `strength_overall_away`, `strength_attack_home/away`, `strength_defence_home/away`.  
Oficjalne API FPL te pola zwykle udostępnia w `teams[]` bootstrapu — **nie są jeszcze mapowane** w `mapBootstrapClub` / `FplBootstrapTeam`.

**Brak na klubie:** sezonowe sumy `goals_scored`, `goals_conceded`, `xG`, `xGC` jako kolumny `fpl_lab_clubs`. Te wartości w Stats Centre (`TEAMS`) są **agregowane w runtime** z historii zawodników (`fpl_lab_player_gw_history`), nie przechowywane jako snapshot klubu.

> **Wymóg silnika v0.2:** Krok 1 musi rozszerzyć `fpl_lab_clubs` o pełne `strength_*` (home/away, attack/defence/overall), bo sekcja 6 używa ich jako priorów Bayesian Shrinkage.

#### `fpl_lab_player_gw_history` (istotne pod FDR / past results)

| Pole kluczowe | Znaczenie |
|---------------|-----------|
| `fixture_id` | ID meczu FPL (w PK — DGW-safe) |
| `gameweek` | 1–38 |
| `opponent_team_id` | przeciwnik |
| `was_home` | Dom / wyjazd |
| `kickoff_time` | kickoff (nullable) |
| Statystyki meczowe | minuty, gole, CS, GC, xG/xA/xGI/xGC, DC, BPS… |

To jest **historia rozegranych występów graczy**, nie kalendarz przyszłych kolejek. Przyszłe `fixture_id` / pary klubów **nie są tu dostępne** przed meczem.

Agregaty klubowe `GF` / `GA` / `xG` / `xGC` / `n_H` / `n_A` dla silnika Dixona-Colesa buduje się z tej historii (oraz z `fpl_lab_fixtures` po synchronizacji) z regułą **Zero-Data-Leakage** (sekcja 6.1).

#### `fpl_lab_players` / `fpl_lab_sync_meta`

Snapshot bootstrap + metadane ETL (`last_finished_gw`, status sync). Bez terminarza.

### 1.3 Jak działa obecny sync FPL

| Endpoint | Użycie w Stats Lab |
|----------|-------------------|
| `GET …/api/bootstrap-static/` | kluby + zawodnicy (snapshot) |
| `GET …/api/element-summary/{id}/` | historia GW gracza → `fpl_lab_player_gw_history` |
| `GET …/api/fixtures/` | **nieużywane** |

Baza API: `FPL_API_BASE = "https://fantasy.premierleague.com/api"` (`syncEngine.ts`).

**Wniosek inwentaryzacyjny:**  
Żeby zbudować `FIXTURES_FDR` / projekcje na przyszłe GW, **Krok 1 nowego wątku musi dodać synchronizację `/api/fixtures/` → nowa tabela `fpl_lab_fixtures`** (oraz rozszerzyć `fpl_lab_clubs` o pełne `strength_*` z bootstrapu).

Szkic docelowych kolumn `fpl_lab_fixtures` (do decyzji w implementacji):

- `season_code`, `fixture_id` (PK), `gameweek`, `kickoff_time`
- `team_h`, `team_a` (fpl_team_id)
- `team_h_score`, `team_a_score` (nullable do kickoff)
- `finished`, `started`, `provisional_start_time` (wg API)
- opcjonalnie: `event` (= GW), `pulse` / difficulty surowe z API jeśli dostępne
- **wymagane pod silnik:** `deadline_time` kolejki (z bootstrap `events[]`) dostępne w runtime lub zmaterializowane

---

## 2. Integracja z architekturą Stats Lab

### 2.1 Nawigacja główna — gdzie wpiąć moduł

Aktualny shell: `components/admin/stats-lab/StatsLabModuleShell.tsx`.

Dziś tylko **2 zakładki**:

| Tab | Komponent |
|-----|-----------|
| `centre` | `StatsCentreView` (FROZEN) |
| `studio` | `StatsLabStudioClient` (FROZEN) |

PL/EN i 3 motywy są **wspólne** w shellu (`LANG_KEY` / `THEME_KEY`).  
„Baza Wiedzy” to modal w Studio (`StatsLabKnowledgeBaseModal`), nie osobny tab.  
Sync: osobna trasa `/admin/stats-lab/sync`.

**Rekomendacja wpięcia (bez ruszania zamrożonych chartów):**

1. Rozszerzyć `ModuleTab` o trzecią wartość, np. `"projections"` / `"fdr"`.
2. Dodać trzeci przycisk w pasku shellu obok Centre / Studio, np. **„Predykcje i Terminarz”** / **„Projections & Fixtures”**.
3. Query: `?tab=projections` (obok `centre` / `studio`).
4. Nowy klient: `StatsLabProjectionsClient.tsx` (lub `TeamProjectionsView.tsx`) — **nowy plik**, nie edycja zamrożonego Centre/Studio poza minimalnym shell switcherem.
5. Nowy silnik: `lib/stats-lab/projectionsEngine.ts` (Dixon-Coles v0.2 — sekcja 6) + `projectionsI18n.ts`.

Alternatywa (gorsza): podtrasa `/admin/stats-lab/projections` jak `/centre` — shell i tak powinien być spójny z PL/EN/motywami.

### 2.2 Eksport plakatów, motywy, i18n, audit

| Element | Stan dziś | Plan dla Projections |
|---------|-----------|----------------------|
| `StatsLabChartCanvas.tsx` | **FROZEN** (Chart Studio) | **Nie modyfikować.** Nowy moduł ma mieć **własną ramę plakatu** (wzorzec `StatsCentreView` + `exportRef`), nie dokładać vizMode do Canvas. |
| Motywy `ARENA_DARK` / `SCOUT_DARK` / `ANALYST_LIGHT` | Shell + `chartTheme` / `themeTokens` | Przekazać `themeId` z shellu; tokeny powierzchni jak w Centre. |
| PL / EN | Shell `lang` | Osobny `projectionsI18n.ts` (jak `statsCentreI18n`). |
| Audyt JSON | `auditExport.ts` (`CHART_STUDIO` \| `STATS_CENTRE`) | Dodać moduł `TEAM_PROJECTIONS` / `PROJECTIONS_CENTRE` + `subView` (`FIXTURES_FDR` …) oraz `inspectCanvasLayoutDom(exportRef)`. |
| Media klubów | `/api/uploads/fpl-lab/badge/{pulse_code}` + `crossOrigin="anonymous"` | Obowiązkowe na plakatach FDR / Matchup. |
| Stopka wiarygodności | — | Obowiązkowa na każdym plakacie (sekcja 7.3). |

**Zero-Regression:** dozwolone zmiany infrastrukturalne (shell tab, nowy silnik, nowa migracja fixtures, rozszerzenie `auditExport` o nowy module enum) — **zakaz** edycji plików Chart Studio charts / Canvas / StudioClient / ControlPanel / `analyticsEngine` oraz zamrożonego Centre bez jawnego polecenia.

---

## 3. Planowane 4 podwidoki (Social-First AAA)

Moduł: **`PROJECTIONS_CENTRE`** z przełącznikiem `subView` (analogia do `centreMode` / `vizMode`).

Wszystkie metryki liczbowe pochodzą z **Dixona-Colesa v0.2** (sekcja 6). Pełne wymagania UX: **sekcja 7**.

Wspólne kontrolki globalne:

- zakres GW suwakiem / od–do (np. GW11–GW22),
- bieżąca kolejka z `fpl_lab_sync_meta.last_finished_gw` + events bootstrap,
- motyw + PL/EN z shellu,
- eksport sparowany `.jpg` + `.json`,
- stopka wiarygodności modelu na plakacie.

### 3.1 `FIXTURES_FDR` — Kalendarz FDR

| Element | Spec |
|---------|------|
| Przełączniki skali | `Ogółem` / `Atak` / `Obrona` |
| Miara w komórce | `Trudność FDR` / `Gole` / `Czyste Konta %` / `Wygrana %` |
| Zakres | suwak GW (np. 11–22) z `fpl_lab_fixtures` |
| Siatka | wiersz = klub; kolumna = GW; Dom/Wyjazd + skrót rywala + kolor FDR |
| Sort | średnia łatwość terminarza / `matchesCount` (nie liczba kolejek!) |
| DGW / BGW | split-cell lub łączna metryka; BGW = `—` |

### 3.2 `PROJECTED_GOALS` — Predykcja goli

| Element | Spec |
|---------|------|
| Tabela | klub × wybrane GW |
| Komórka | `lambda` z modelu (`lambda_H` / `lambda_A`; w DGW suma) |
| Kolumna końcowa | **`SUMA` / `TOTAL`** w zakresie |
| Preset | `Top Ataki: Następne 6 GW` |
| Sort | po sumie projected goals |

### 3.3 `CLEAN_SHEETS` — Szanse CS%

| Element | Spec |
|---------|------|
| Tabela | klub × GW |
| Komórka | `cs = exp(-lambda_opp)`; w DGW: expected CS `p1+p2` lub `P(≥1 CS)` w komórce |
| Kolumna końcowa | **`SUMA` / `TOTAL`** oczekiwanych czystych kont |
| Preset | `Top Obrony: Następne 6 GW` |
| Sort | po sumie expected CS |

### 3.4 `MATCHUP_CARDS` — Karty pojedynków

| Element | Spec |
|---------|------|
| Wejście | wybrana jedna GW |
| Karta | Gospodarz vs Gość (herby + notacja `(D)/(H)` · `(W)/(A)`) |
| Metryki | `Gole`, `CS%`, `1X2%`, **Top 3 dokładne wyniki** |
| Tryby | Plakat 1-GW 3-kolumnowy (styl FPL Joe) · `Weryfikacja: Predykcje vs Rzeczywistość` |
| Layout | siatka kart Social-First |

---

## 4. Roadmapa implementacji (kolejne wątki)

| Krok | Zakres |
|------|--------|
| **1** | Migracja `fpl_lab_fixtures` + sync `GET /api/fixtures/` + pełne `strength_*` w `fpl_lab_clubs` |
| **2** | `projectionsEngine.ts` — Dixon-Coles v0.2 (sekcja 6) + testy QA #1–#3 |
| **3** | Shell tab `projections` + szkielet UI + `projectionsI18n` + motywy |
| **4** | `FIXTURES_FDR` (ticker, filtry Dom/Wyjazd, układy komórki, FDR 0–100 / 1–5) |
| **5** | `PROJECTED_GOALS` + `CLEAN_SHEETS` (SUMA, preset Next 6, DGW/BGW) |
| **6** | `MATCHUP_CARDS` + plakat 3-kolumnowy + weryfikacja vs rzeczywistość + audit JPG/JSON |
| **7** | Dokumentacja zamrożenia `docs/09-…` gdy AAA ukończone |

---

## 5. Podsumowanie inwentaryzacji (jednym zdaniem)

**Nie mamy w bazie Stats Lab tabeli przyszłych meczów PL** — mamy tylko kluby (skalarne `strength`), snapshot graczy i historię meczów graczy; **Krok 1 nowego wątku musi dodać sync darmowego endpointu FPL `/api/fixtures/` → `fpl_lab_fixtures`** oraz pełne `strength_*`, zanim powstanie silnik Dixona-Colesa i widoki FDR / projekcje / karty meczowe.

---

## 6. Specyfikacja Silnika Matematycznego (`lib/stats-lab/projectionsEngine.ts` — Model Dixona-Colesa v0.2)

Plik docelowy (jeszcze nieistniejący): `lib/stats-lab/projectionsEngine.ts`.  
Wszystkie wzory poniżej są **kontraktem implementacyjnym** — Zero-Regression względem Chart Studio / Stats Centre.

### 6.1 Zasada Zero-Data-Leakage (brak przecieku danych po deadlinie)

Prognoza dla kolejki `GW_k` używa **wyłącznie** meczów zakończonych spełniających:

```
finished === true
AND kickoff_time < deadline_time(GW_k)
```

Zakazane: używanie wyników meczów rozegranych po deadlinie `GW_k`, live scores niedokończonych spotkań, oraz jakichkolwiek pól przyszłych fixture’ów poza tożsamością przeciwnika / venue / `fixture_id`.

`deadline_time(GW_k)` pochodzi z bootstrap `events[k].deadline_time`.

### 6.2 Dane wejściowe dla każdego klubu (rozdzielone na Dom `H` i Wyjazd `A`)

#### Z historii meczów (agregacja klubowa, z Zero-Data-Leakage)

Dla venue `V ∈ {H, A}`:

| Symbol | Opis |
|--------|------|
| `GF` | gole strzelone |
| `GA` | gole stracone |
| `xG` | expected goals for |
| `xGC` | expected goals against |
| `n_V` | liczba rozegranych meczów w venue `V` |

Opcjonalna waga czasowa meczu `m`:

```
w_m = exp(-0.0065 * delta_days)
```

gdzie `delta_days` = dni między kickoffem meczu a `deadline_time(GW_k)`.  
Przy wagach: `GF`, `GA`, `xG`, `xGC`, `n_V` stają się sumami ważonymi.

#### Z `fpl_lab_clubs` (bootstrap FPL — po Kroku 1)

| Pole | Rola w modelu |
|------|----------------|
| `strength_attack_home` / `strength_attack_away` | prior ataku (`SA`) |
| `strength_defence_home` / `strength_defence_away` | prior obrony (`SD`) |
| `strength_overall_home` / `strength_overall_away` | kontekst / fallback overall |

### 6.3 Średnie ligowe z bezpiecznym fallbackiem (Poprawka QA #2 i #3)

Stałe:

```
MU_H_BASE = 1.55
MU_A_BASE = 1.25
K_MU      = 30
```

Średnie ligowe z shrinkage:

```
mu_H = (N_matches * mu_H_season + K_MU * MU_H_BASE) / (N_matches + K_MU)
mu_A = (N_matches * mu_A_season + K_MU * MU_A_BASE) / (N_matches + K_MU)
```

Gdy `N_matches === 0` (start sezonu / brak historii przed deadline’em):

```
mu_H = 1.55
mu_A = 1.25
```

`N_matches` = liczba meczów ligowych spełniających Zero-Data-Leakage (nie liczba wierszy graczy).

### 6.4 Siła Ataku i Obrony z regularyzacją (Bayesian Shrinkage)

Stałe:

```
K     = 6      // siła prioru
alpha = 0.7    // waga xG vs gole
kappa = 2.0    // wykładnik prioru FPL strength
```

#### Sygnał bramkowy

```
g_for  = alpha * xG  + (1 - alpha) * GF   // = 0.7 * xG  + 0.3 * GF
g_agst = alpha * xGC + (1 - alpha) * GA   // = 0.7 * xGC + 0.3 * GA
```

#### Prior z oficjalnych sił FPL

Walidacja: jeśli `SA <= 0` lub `SD <= 0` (lub `NaN` / brak) → fallback `SA = 1.0` / `SD = 1.0` względem średniej ligowej, albo wprost:

```
a_prior = 1.0
d_prior = 1.0
```

Gdy `SA > 0` i `SD > 0`:

```
a_prior = Math.pow(SA / mean_SA, kappa)       // kappa = 2.0
d_prior = Math.pow(mean_SD / SD, kappa)       // wyższe d = słabsza obrona = więcej traconych goli
```

`mean_SA` / `mean_SD` = średnie po 20 klubach dla danego venue (home/away osobno).

#### Jawna gałąź zabezpieczająca przed `0 * NaN` (Poprawka QA #2)

Dla venue `V` i odpowiadającego `mu_V` / `mu_opp_V` (przeciwne średnie: atak H vs μ_A, atak A vs μ_H itd.):

```
jeśli n_V <= 0:
  a_V = a_prior
  d_V = d_prior

jeśli n_V > 0:
  a_data = (g_for  / n_V) / mu_V
  d_data = (g_agst / n_V) / mu_opp_V
  a_V = (n_V * a_data + K * a_prior) / (n_V + K)
  d_V = (n_V * d_data + K * d_prior) / (n_V + K)
```

#### Clamp mnożników

```
a_V, d_V ∈ [0.40, 2.50]
```

### 6.5 Oczekiwane Gole (`lambda_H`, `lambda_A`) i Czyste Konto (`CS%`)

Dla meczu Gospodarz `H` vs Gość `A`:

```
lambda_H = clamp(mu_H * a_home_H * d_away_A, 0.15, 4.50)
lambda_A = clamp(mu_A * a_away_A * d_home_H, 0.15, 4.50)
```

#### Własności poprawki Dixona-Colesa (Poprawka QA #1)

| Metryka | Wartość |
|---------|---------|
| **Projected Goals** | dokładnie `lambda_H` / `lambda_A` (margines Poisson — niezależnie od `rho`) |
| **Clean Sheet probability** | wzór zamknięty: `cs_H = Math.exp(-lambda_A)`, `cs_A = Math.exp(-lambda_H)` |

Nie wolno estymować CS% przez sumowanie siatki wyników (ryzyko obcięcia ogona) — używać wyłącznie wzoru zamkniętego.

### 6.6 Siatka wyników Dixona-Colesa (`rho = -0.10`)

Domyślnie:

```
rho = -0.10
```

#### Clamp korelacji

```
r = clamp(
  rho,
  Math.max(-1 / lambda_H, -1 / lambda_A),
  Math.min(1 / (lambda_H * lambda_A), 1)
)
```

#### Dynamiczny rozmiar siatki (eliminacja błędu obcięcia ogona)

```
maxGoals = Math.max(
  12,
  Math.ceil(Math.max(lambda_H, lambda_A) + 8 * Math.sqrt(Math.max(lambda_H, lambda_A)))
)
```

Budowa macierzy `P(x, y)` dla `x, y ∈ 0..maxGoals` z korektą Dixona-Colesa dla niskich scoreline’ów (0-0, 1-0, 0-1, 1-1) przy parametrze `r`, następnie **pełna renormalizacja**:

```
sum = Σ P(x,y)
P(x,y) ← P(x,y) / sum     // suma macierzy = 1.0
```

#### Produkty z siatki

| Produkt | Definicja |
|---------|-----------|
| **Top 3 Exact Scores** | trzy najwyższe `P(x,y)` po tie-breakerze |
| **1X2 Win/Draw/Loss %** | `P_win = Σ_{x>y} P`, `P_draw = Σ_{x=y} P`, `P_loss = Σ_{x<y} P` |
| **2+ Goals %** | dla drużyny: `Σ_{x≥2} P(x,·)` (home) / `Σ_{y≥2} P(·,y)` (away) |

#### Deterministyczny tie-breaker Top 3 Exact Scores

Kolejność sortowania scoreline’ów:

1. niezaokrąglone `P(x,y)` **DESC**,
2. mniejsza suma goli `x + y` **ASC**,
3. więcej goli gospodarza `x` **DESC**.

### 6.7 Skala trudności `FDR` (0–100 oraz poziomy 1–5)

Helper liniowy:

```
lin(v, lo, hi):
  jeśli (hi - lo) <= 1e-6 → zwróć 0.5
  t = clamp((v - lo) / (hi - lo), 0, 1)
  zwróć t
```

Trzy tryby (wyższe FDR = trudniejszy mecz z perspektywy drużyny):

```
FDR_Attack  = 100 * (1 - lin(lambda_team, 0.60, 2.60))
FDR_Defence = 100 * (1 - lin(cs_prob_team, 0.08, 0.55))
FDR_Overall = 100 * (1 - lin(P_win + 0.5 * P_draw, 0.15, 0.85))
```

Poziom 1–5:

```
level = Math.min(5, Math.floor(fdr / 20) + 1)
```

| FDR 0–100 | Poziom |
|-----------|--------|
| 0–19 | 1 (łatwy) |
| 20–39 | 2 |
| 40–59 | 3 |
| 60–79 | 4 |
| 80–100 | 5 (trudny) |

### 6.8 Obsługa DGW (Podwójna Kolejka) i BGW (Pusta Kolejka)

#### Kluczowanie

Zawsze po **`fixture_id`** — nigdy po `(team_id + gw)`.

#### DGW

| Metryka | Reguła |
|---------|--------|
| Projected Goals (komórka GW) | `lambda_1 + lambda_2` |
| TOTAL oczekiwanych CS (kolumna SUMA) | `p1 + p2` (suma oczekiwanych czystych kont) |
| Komórka CS w macierzy GW | prezentacja **obu meczów** (split-cell) **albo** `P(≥1 CS) = 1 - (1-p1)*(1-p2)` — **nigdy > 100%** |
| Średnia trudność terminarza | zawsze ÷ **`matchesCount`** (liczba meczów), nie ÷ liczba kolejek |

#### BGW

| Metryka | Reguła |
|---------|--------|
| Wartość | `null` |
| UI | `—` (`BLANK`) |
| Średnie / sort | wyłączona ze średnich; na **końcu** sortowania |

---

## 7. Wymagania UX i Social-First AAA (wnioski z researchu rynkowego)

Wzorce rynkowe: FPL Joe / FPL Review — adaptacja do **Social-First AAA FPL Arena** (3 motywy, PL/EN, eksport X/Discord, audit DOM).

### 7.1 Oznaczanie Dom / Wyjazd

#### Wielokolejkowa macierz `FIXTURES_FDR`

| Reguła | Spec |
|--------|------|
| Dom | **WIELKIE LITERY** skrótu rywala (`ARS`) |
| Wyjazd | **małe litery** skrótu rywala (`avl`) |
| Układ komórki | przełącznik: `Tylko tekst` / `Tekst + Herb` / `Duży Herb` |
| Filtr venue | `Wszystkie` / `Tylko Dom` / `Tylko Wyjazd` |
| Kolumny GW | możliwość kliknięcia i **ukrycia** pojedynczej kolejki |

Herby: `/api/uploads/fpl-lab/badge/{pulse_code}` + `crossOrigin="anonymous"`.  
**Zakaz** `truncate` / `text-ellipsis` na skrótach klubów w eksporcie.

#### Widoki 1-kolejkowe i karty meczowe

Jednoznaczna notacja venue:

| PL | EN |
|----|----|
| `IPS (D)` | `IPS (H)` |
| `HUL (W)` | `HUL (A)` |

### 7.2 Dedykowane widoki i eksporty pod X / Discord

#### `FIXTURES_FDR`

- Kalendarz FDR z przełącznikami `Ogółem` / `Atak` / `Obrona`.
- Miara w komórkach: `Trudność FDR` / `Gole` / `Czyste Konta %` / `Wygrana %`.
- Sort wg średniej łatwości (`matchesCount`), BGW na końcu.
- Eksport plakatu zakresowego (np. GW11–GW22) + JSON audit.

#### `PROJECTED_GOALS`

- Tabela oczekiwanych goli na wybrane GW + kolumna **`SUMA` / `TOTAL`**.
- Szybki preset: **`Top Ataki: Następne 6 GW`**.
- DGW: suma `lambda`; BGW: `—`.

#### `CLEAN_SHEETS`

- Tabela szans CS w `%` + kolumna **`SUMA` / `TOTAL`** oczekiwanych CS.
- Szybki preset: **`Top Obrony: Następne 6 GW`**.
- DGW: expected CS `p1+p2` w TOTAL; w komórce split lub `P(≥1 CS)` bez przekroczenia 100%.

#### `MATCHUP_CARDS`

- Karty wybranej kolejki: Gospodarz vs Gość.
- Metryki: `Gole`, `CS%`, `1X2%`, **Top 3 dokładne wyniki**.
- Tryb **`Plakat 1-GW 3-kolumnowy`** (styl FPL Joe).
- Tryb **`Weryfikacja: Predykcje vs Rzeczywistość`** dla zakończonych kolejek (porównanie `lambda` / Top-3 / 1X2 z wynikiem rzeczywistym — wyłącznie dla GW z `finished` meczami; bez naruszenia Zero-Data-Leakage przy budowie modelu dla kolejnych GW).

### 7.3 Stopka wiarygodności na każdym plakacie

Każdy eksport JPG musi zawierać czytelną stopkę (PL/EN, kontrast we wszystkich 3 motywach), np.:

> **Model Dixona-Colesa FPL Arena · xG + siła drużyn · Dane sprzed deadline'u GW**  
> Sync: `{synced_at}` · Sezon: `{season_code}` · Zakres / GW: `{range_or_gw}`

Wymagania:

- źródło wyliczeń + zasada Zero-Data-Leakage widoczna na pierwszy rzut oka,
- czas synchronizacji z `fpl_lab_sync_meta` / timestamp sync fixtures,
- brak uciętego tekstu w stopce (`layoutDiagnostics.truncatedOrOverflowingElements: []`).

### 7.4 Kontrakt jakości UI (Zero-Regression Social-First)

| Wymóg | Reguła |
|-------|--------|
| Motywy | pełny kontrast `ARENA_DARK` / `SCOUT_DARK` / `ANALYST_LIGHT` |
| Języki | `pl` + `en` |
| Tailwind opacity | tylko oficjalne kroki v3 (`/5`…`/95`) — zakaz `/35`, `/45` |
| Audit | `truncatedOrOverflowingElements: []`, `overlappingLabels: []`, `zeroWidthSegments: []` |
| Weryfikacja | na końcu implementacji: `npx tsc --noEmit` = 0 błędów |

---

## Załącznik A — Checklist QA silnika (do testów jednostkowych w Kroku 2)

| ID | Test | Oczekiwanie |
|----|------|-------------|
| QA #1 | CS% vs siatka | `cs_H === exp(-lambda_A)` (nie suma siatki); Projected Goals === `lambda` |
| QA #2 | `n_V === 0` | `a_V = a_prior`, `d_V = d_prior`; brak `NaN`; `mu_*` = BASE |
| QA #3 | Start sezonu `N_matches === 0` | `mu_H = 1.55`, `mu_A = 1.25` |
| QA #4 | Clamp `r` | `r` w legalnym przedziale względem `lambda_H/A` |
| QA #5 | Duże `lambda` | `maxGoals` dynamiczne + renormalizacja sumy = 1 |
| QA #6 | Top 3 tie | kolejność: P DESC → `(x+y)` ASC → `x` DESC |
| QA #7 | DGW CS | komórka nigdy > 100%; TOTAL = `p1+p2` |
| QA #8 | BGW | `null` / `—`; wyłączone ze średnich; koniec sortu |
| QA #9 | Zero-Data-Leakage | mecz po `deadline_time(GW_k)` nie wpływa na `lambda` dla `GW_k` |
| QA #10 | FDR `lin` | gdy `hi-lo <= 1e-6` → `0.5` |
