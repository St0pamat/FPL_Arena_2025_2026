"""Dodaje presentationVideoUrl do src/data/players.ts."""
import re
from pathlib import Path

from gen_presentations import MAPPING

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "src" / "data" / "players.ts"
text = path.read_text(encoding="utf-8")

for pid, url in MAPPING:
    block_start = text.find(f"id: {pid},")
    if block_start < 0:
        raise SystemExit(f"Player {pid} not found")
    block_end = text.find("\n    },", block_start)
    block = text[block_start:block_end]
    if "presentationVideoUrl" in block:
        continue
    insert_at = block.find("\n        transfers:")
    if insert_at < 0:
        raise SystemExit(f"No transfers line for {pid}")
    line = f'\n        presentationVideoUrl: "{url}",'
    block = block[:insert_at] + line + block[insert_at:]
    text = text[:block_start] + block + text[block_end:]

path.write_text(text, encoding="utf-8")
print("Patched players.ts")
