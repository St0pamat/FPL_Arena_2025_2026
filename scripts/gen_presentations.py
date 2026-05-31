"""Generuje src/data/presentations.ts z _scripts.txt i mapy URL."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = Path(r"c:\Users\st0pa\Downloads\Skrypty Prezentacji Gladiatorów.docx")

MAPPING = [
    (4002, "https://youtu.be/1b1oVJwVfqo?si=TbYNryLFDmJOe_nU"),
    (68435, "https://youtu.be/e3j9l4Qok2M?si=jbWKOKR76TDp69MT"),
    (3749264, "https://youtu.be/VYajb1w933s?si=fwoGSctEux58k4li"),
    (298030, "https://youtu.be/jdi94-Hdwi8?si=ZHGHN_JSNXNxLzNA"),
    (2953280, "https://youtu.be/1sVX6Hyo-nk?si=RWy-zvTSMWOKJaXK"),
    (43986, "https://youtu.be/VOMvP_3YYiI?si=NQpkMBGPPsDiGCKK"),
    (248187, "https://youtu.be/xtoplo46VP8?si=0_l3xMiwp1mQpj9m"),
    (1178442, "https://youtu.be/IGwiUaLoPmA?si=lhy8I0ud-TV6jYy1"),
    (9084, "https://youtu.be/40si3R7p5Pg?si=vfSn_gaEL0LR-XyQ"),
    (49321, "https://youtu.be/FvPXl1lr9Bg?si=IVFA_6HL8mHZJocF"),
    (24962, "https://youtu.be/gB-ZhNxYFuA?si=Eh7k69HMki0jmnu1"),
    (546068, "https://youtu.be/APnzYkYTG3U?si=Dnh2KcX5FfLnZRdT"),
    (1109898, "https://youtu.be/yg4eMK1dj1A?si=7tlRzOFXQP5XW7Z2"),
    (418929, "https://youtu.be/srYofJ2CktQ?si=iMn9be7ruV-OZjd9"),
    (22952, "https://youtu.be/ft3QbJW81Jk?si=YU2xtuzLrR_6Warc"),
    (126745, "https://youtu.be/kH5YD9mP2iU?si=s-atrarNTvoHXe3y"),
    (3804416, "https://youtu.be/vcG4k6CVBhg?si=B58-9I_8EqNvhZNP"),
    (425158, "https://youtu.be/H0frKTJBnfA?si=WEATTOan2G8KEAeW"),
    (55981, "https://youtu.be/Pi80KSeI0YY?si=8A8qevfqIa4hq5B_"),
    (3873739, "https://youtu.be/wQ5t-BZF_dk?si=1XGJNV_zH5Q_j6t2"),
]


def read_docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    paras = []
    for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        texts = [
            t.text or ""
            for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
        ]
        line = "".join(texts).strip()
        if line:
            paras.append(line)
    return paras


def parse_scripts(paras: list[str]) -> list[dict]:
    entries = []
    i = 0
    while i < len(paras):
        line = paras[i]
        if re.match(r"^\d+\.\s", line):
            title = line
            i += 1
            body = []
            while i < len(paras) and not re.match(r"^\d+\.\s", paras[i]):
                body.append(paras[i])
                i += 1
            entries.append({"title": title, "script": "\n\n".join(body).strip()})
        else:
            i += 1
    return entries


def ts_string(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def main():
    paras = read_docx_paragraphs(DOCX)
    scripts = parse_scripts(paras)
    if len(scripts) != 20:
        raise SystemExit(f"Expected 20 scripts, got {len(scripts)}")

    flat = []
    for (pid, url), entry in zip(MAPPING, scripts):
        vid = url.split("youtu.be/")[1].split("?")[0]
        flat.append(
            {
                "playerId": pid,
                "youtubeUrl": url,
                "youtubeId": vid,
                "scriptTitle": entry["title"],
                "script": entry["script"],
            }
        )

    columns = [flat[c * 5 : (c + 1) * 5] for c in range(4)]

    out = ROOT / "src" / "data" / "presentations.ts"
    lines = [
        "export interface GladiatorPresentation {",
        "  playerId: number;",
        "  youtubeUrl: string;",
        "  youtubeId: string;",
        "  scriptTitle: string;",
        "  script: string;",
        "}",
        "",
        "/** Kolejność z oficjalnego skryptu — 4 kolumny × 5 graczy. */",
        "export const PRESENTATION_COLUMNS: GladiatorPresentation[][] = [",
    ]
    for col in columns:
        lines.append("  [")
        for item in col:
            lines.append("    {")
            lines.append(f"      playerId: {item['playerId']},")
            lines.append(f"      youtubeUrl: {ts_string(item['youtubeUrl'])},")
            lines.append(f"      youtubeId: {ts_string(item['youtubeId'])},")
            lines.append(f"      scriptTitle: {ts_string(item['scriptTitle'])},")
            lines.append(f"      script: {ts_string(item['script'])},")
            lines.append("    },")
        lines.append("  ],")
    lines.append("];")
    lines.append("")
    lines.append("export const PRESENTATION_VIDEO_BY_ID: Record<number, string> = {")
    for item in flat:
        lines.append(f"  {item['playerId']}: {ts_string(item['youtubeUrl'])},")
    lines.append("};")
    lines.append("")

    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out} ({len(flat)} presentations)")


if __name__ == "__main__":
    main()
