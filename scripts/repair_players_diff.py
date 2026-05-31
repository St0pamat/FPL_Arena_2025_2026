"""Repair corrupted superStar/rankKiller fields in players.ts using highlights."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "src" / "data" / "players.ts"
HL = ROOT / "player_highlights.json"

hl = json.load(HL.open(encoding="utf-8"))
lines = PLAYERS.read_text(encoding="utf-8").splitlines()


def fmt_pick(row: dict | None) -> str:
    if not row or not row.get("name"):
        return "Brak danych"
    net = float(row["net"])
    rounded = f"{net:.0f}" if abs(net - round(net)) < 0.05 else f"{net:.1f}"
    sign = "+" if net >= 0 else ""
    return f"{row['name']} ({sign}{rounded} pkt)"


current_id = None
fixed = []
for line in lines:
    id_m = re.search(r"\bid:\s*(\d+)", line)
    if id_m:
        current_id = id_m.group(1)

    if current_id and "superStar:" in line and "pointsBenched:" in line:
        data = hl.get(current_id, {})
        gain = (data.get("topGains") or [None])[0]
        loss = (data.get("topLosses") or [None])[0]
        ss = fmt_pick(gain)
        rk = fmt_pick(loss)
        line = re.sub(
            r'superStar:\s*".*?,\s*pointsBenched:',
            f'superStar: "{ss}", rankKiller: "{rk}", pointsBenched:',
            line,
        )

    fixed.append(line)

text = "\n".join(fixed)
if not text.endswith("\n"):
    text += "\n"
text = text.replace("];;", "];")
PLAYERS.write_text(text, encoding="utf-8")
print("Repaired players.ts")
