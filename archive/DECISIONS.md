# Pliki do ręcznej decyzji

Te elementy **nie zostały usunięte** — są potrzebne do regeneracji danych lub mogą istnieć poza repozytorium (OneDrive / lokalnie).

| Plik / folder | Status | Sugestia |
|---------------|--------|----------|
| `wyniki_h2h_fpl.xlsx` | Wejście dla `konwertuj_wyniki.py` | Zostaw w katalogu głównym lub przenieś do `data/source/` i zaktualizuj skrypt |
| `highlights/*.xlsx` | Wejście dla `konwertuj_highlights.py` | Folder źródłowy analiz — nie commituj dużych xlsx, jeśli nie chcesz |
| `Baza Danych Gladiatorów_*.xlsx` | Wejście dla `konwertuj_or.py` | Jak wyżej — tylko jeśli regenerujesz OR |
| `logo/` (katalog główny) | Herby drużyn | `sync-public.ps1` kopiuje do `public/logo/` — możesz wersjonować tylko `public/logo/` **albo** tylko `logo/` |
| `*.json` w katalogu głównym | Źródło prawdy dla Pythona i sync | **Zostaw** — kopie w `public/` są generowane i są w `.gitignore` |
| `archive/` | Referencja historyczna | Usuń cały folder, gdy nie potrzebujesz monolitu HTML |
