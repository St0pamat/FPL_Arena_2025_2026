import json
import os

source_file = "wyniki_h2h_fpl.xlsx"
output_json = "wyniki_meczy.json"

print(f"🚀 Uruchamiam proces generowania bazy z pliku '{source_file}'...")

if not os.path.exists(source_file):
    print(f"❌ Blad: Nie znaleziono pliku '{source_file}'!")
else:
    try:
        # Odczyt pliku w trybie tekstowym z ignorowaniem "brudnych" znaków z LiveFPL
        with open(source_file, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            
        matches = []
        # Przeszukiwanie pliku linijka po linijce
        for line in lines:
            line = line.strip()
            # Szukamy tylko tych linii, które zaczynają się od numeru kolejki i przecinka (np. "1,Rafal...")
            if len(line) > 0 and line[0].isdigit() and "," in line:
                parts = line.split(",")
                
                # Zabezpieczenie przed uciętymi liniami
                if len(parts) >= 6:
                    try:
                        gw = int(parts[0].strip())
                        teamA = parts[2].strip()
                        pointsA = int(parts[3].strip())
                        pointsB = int(parts[4].strip())
                        teamB = parts[5].strip()
                        
                        matches.append({
                            "teamA": teamA,
                            "pointsA": pointsA,
                            "teamB": teamB,
                            "pointsB": pointsB,
                            "gw": gw
                        })
                    except ValueError:
                        continue # Pomijamy wiersze z błędnymi danymi (np. podsumowania)

        # Grupowanie meczów w konkretne kolejki (GW)
        final_json_structure = []
        for gw_number in range(1, 39):
            gw_matches = [m for m in matches if m['gw'] == gw_number]
            # Czyścimy pole 'gw' ze środka meczu, bo jest już w nagłówku
            for m in gw_matches:
                del m['gw']
                
            if gw_matches:
                final_json_structure.append({
                    "gw": gw_number,
                    "matches": gw_matches
                })
                
        # Zapisz do JSON
        with open(output_json, "w", encoding="utf-8") as json_file:
            json.dump(final_json_structure, json_file, ensure_ascii=False, indent=2)
            
        print(f"✨ SUKCES! Wygenerowano czysty plik '{output_json}'.")
        print(f"Przetworzono kolejek: {len(final_json_structure)}")
        print(f"Lacznie meczow: {len(matches)}")

    except Exception as e:
        print(f"💥 Blad podczas konwersji: {e}")