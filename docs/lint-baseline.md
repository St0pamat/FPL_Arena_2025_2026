# ESLint baseline

Stan po rozszerzeniu `ignores` w `eslint.config.js` o `.next/`, `coverage/`, `playwright-report/`, `test-results/` (bez zmiany reguł).

**Data pomiaru:** 2026-11-13  
**Komenda:** `npm run lint`  
**Łącznie:** 119 problemów — **57 errors**, **62 warnings**

Wcześniejszy stan zastany (przed ignores): ~231 problemów (m.in. z `.next/types`).

## Podział na katalogi top-level

| Katalog | Errors | Warnings | Razem |
|---------|-------:|---------:|------:|
| `components/` | 50 | 24 | 74 |
| `app/` | 2 | 16 | 18 |
| `src/` | 0 | 18 | 18 |
| `lib/` | 5 | 4 | 9 |
| **Suma** | **57** | **62** | **119** |

## Uwagi

- CI uruchamia `npm run lint` z `continue-on-error: true`, dopóki baseline nie spadnie do zera.
- Nie poprawiać tych problemów „przy okazji” — tylko celowane zadania redukujące baseline.
