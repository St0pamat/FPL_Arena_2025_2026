# Stats Lab — Architektura i baza danych

| Pole | Wartość |
|------|---------|
| Zakres | Shell Stats Lab · Supabase `fpl_lab_*` · cache RAM · audyt DOM · Baza Wiedzy |
| Status | Aktualne na zamknięcie etapu `PROJECTIONS_CENTRE` (PASS AAA) |

Powiązane: [`00-ACTIVE-ROADMAP.md`](./00-ACTIVE-ROADMAP.md) · [`02-SILNIK-ANALITYCZNY-I-METRYKI.md`](./02-SILNIK-ANALITYCZNY-I-METRYKI.md) · [`08-PREDYKCJE-KLUBOW-I-FDR.md`](./08-PREDYKCJE-KLUBOW-I-FDR.md).

---

## 1. Shell aplikacji (`StatsLabModuleShell.tsx`)

Jedna strona `/admin/stats-lab` z zakładkami:

| Tab | Komponent | Status |
|-----|-----------|--------|
| `centre` | `StatsCentreView` | FROZEN |
| `studio` | `StatsLabStudioClient` | FROZEN |
| `projections` | `StatsLabProjectionsClient` | FROZEN |
| *(plan)* `planner` | `StatsLabPlannerClient` (Moduł 4) | roadmap |

Globalny chrome: język PL/EN, motyw (`ARENA_DARK` / `SCOUT_DARK` / `ANALYST_LIGHT`), przycisk **📚 Baza Wiedzy i Zasady FPL**.

### 1.1 Keep-Alive zakładek

- Stan `visitedTabs: Set<ModuleTab>` — raz odwiedzona zakładka **pozostaje zamontowana** w DOM.
- Nieaktywne zakładki: `className="hidden"` + `aria-hidden`.
- Aktywna przestrzeń robocza: `data-stats-lab-active-workspace="true"` na wrapperze widocznego modułu.
- Korzyść: brak pełnego remountu / ponownego fetchu przy przełączaniu Centre ↔ Studio ↔ Predykcje; audyt DOM skanuje **tylko** aktywny workspace.

Root shella: `data-stats-lab-shell-root="true"`, `data-stats-lab-theme`, `data-stats-lab-lang`, `data-stats-lab-active-tab`.

---

## 2. Turbo-Cache RAM — `lib/stats-lab/serverDataCache.ts`

### 2.1 Magazyn

```ts
globalThis.__fplStatsLabDatasetCache = {
  bySeason: Map<string, StatsLabCachedDataset>
}
```

- TTL: **5 minut** (`CACHE_TTL_MS`).
- Klucz sezonu: `seasonCode` (np. `2025/26`).

### 2.2 Walidacja fingerprintem sync

Z `fpl_lab_sync_meta` pobierane są:

- `updated_at`
- `last_bootstrap_sync_at`
- `last_history_sync_at`

Fingerprint:

```text
lastSyncedAt = `${updatedAt}|${lastBootstrapSyncAt}|${lastHistorySyncAt}`
```

Hit cache tylko gdy:

1. wpis istnieje dla `seasonCode`,
2. `hit.lastSyncedAt === lastSyncedAt`,
3. `now - hit.cachedAt < TTL`.

Po miss: równoległy load `fpl_lab_clubs`, `fpl_lab_players`, `fpl_lab_fixtures` + stronicowana historia `fpl_lab_player_gw_history` (Turbo: concurrency 6 × page 1000).

Konsumenci: server actions Studio / Centre / Projections (`getCachedStatsLabDataset`).

---

## 3. Tabele Supabase (Stats Lab)

| Tabela | Rola |
|--------|------|
| `fpl_lab_clubs` | 20 klubów PL + `strength_*` (home/away, attack/defence/overall), herb `pulse_code` |
| `fpl_lab_players` | Snapshot bootstrap zawodników (ceny, punkty, forma, ICT, DC…) |
| `fpl_lab_player_gw_history` | Historia GW (PK: sezon + element + fixture) |
| `fpl_lab_fixtures` | Terminarz PL (przyszłe + zakończone) + deadline GW |
| `fpl_lab_sync_meta` | Metadane ETL / fingerprint cache |

Sync: `lib/stats-lab/syncEngine.ts` + `app/admin/actions/statsLabSync.ts`  
API FPL: `bootstrap-static`, `element-summary/{id}`, `fixtures`.

---

## 4. Globalna Baza Wiedzy

| Plik | Rola |
|------|------|
| `StatsLabKnowledgeBaseModal.tsx` | Modal (theme-aware), wyszukiwarka, zakładki PL/EN |
| `lib/stats-lab/knowledgeBaseContent.ts` | Treść: 3 moduły + scoring/DC + słownik |
| Shell | Przycisk globalny otwiera modal niezależnie od aktywnej zakładki |
| `KnowledgeHelpButton` | Lokalne `?` w Control Panelu (kotwice `per90` / `dc` / `scale`) |

`activeModuleTab` przekazywany do modala jako kontekst (Centre / Studio / Projections).

---

## 5. Audyt DOM całej strony — `inspectFullStatsLabPageDom`

Lokalizacja: `lib/stats-lab/auditExport.ts`.

- Skanuje shell + menu + **aktywny** workspace (`[data-stats-lab-active-workspace="true"]`).
- Wykrywa: niski kontrast, mismatch motywu, ucięty tekst, ciasne elementy, nieostylowane `<option>`, itd.
- Wynik w eksporcie AI JSON: `pageAndMenuDiagnostics` (+ `layoutDiagnostics` plakatu).
- Kontrakt PASS AAA: `totalIssuesCount: 0` we wszystkich 3 motywach.

Wspólne klasy przycisków: `lib/stats-lab/menuChrome.ts` (`exportPrimary` / `exportSecondary` / `activeBtn` / `inactiveBtn`).

---

## 6. Media

Lokalne endpointy (CORS / eksport html-to-image):

- `/api/uploads/fpl-lab/player/{code}`
- `/api/uploads/fpl-lab/badge/{pulse}`

Atrybut: `crossOrigin="anonymous"`.
