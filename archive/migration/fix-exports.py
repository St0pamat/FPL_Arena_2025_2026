#!/usr/bin/env python3
"""Prefix top-level const/function with export in src/."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

SKIP = {"data/players.ts"}

for path in sorted(SRC.rglob("*")):
    if path.suffix not in (".ts", ".tsx"):
        continue
    rel = str(path.relative_to(SRC)).replace("\\", "/")
    if rel in SKIP:
        continue
    text = path.read_text(encoding="utf-8")
    out_lines = []
    for line in text.splitlines():
        if re.match(r"^(const|function) ", line) and not line.startswith("export "):
            line = "export " + line
        out_lines.append(line)
    path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print(rel)
