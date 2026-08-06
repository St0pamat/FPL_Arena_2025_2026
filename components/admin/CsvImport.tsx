"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { bulkUpsertTeams } from "@/app/admin/actions/db";
import type { Pyramid, Season } from "@/lib/admin/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubLogo } from "@/components/admin/ClubLogo";
import { resolveLogoSrc } from "@/components/admin/ClubNameWithLogo";

const H = {
  division: "Dywizja",
  fplTeam: "FPL Team",
  fplManager: "FPL Manager",
  fplId: "FPL ID",
  discordName: "Discord Name",
  discordClub: "Discord Club",
  paid: "Wpłacono",
} as const;

type CsvRow = Record<string, string>;

export type ParsedTeam = {
  rowIndex: number;
  tier: number;
  fpl_team_name: string;
  manager_name: string;
  fpl_id: string;
  discord_nick: string;
  chosen_club: string;
  fee_paid: boolean;
  isValid: boolean;
  errors: string[];
};

interface CsvImportProps {
  seasons: Season[];
  pyramids: Pyramid[];
  logos?: ClubLogoRecord[];
}

function cell(row: CsvRow, key: string): string {
  const raw = row[key] ?? "";
  return String(raw ?? "").trim();
}

/** "10,00 zł" / "10" / cokolwiek zawierającego "10" → true */
function parseFeePaid(value: string): boolean {
  return value.includes("10");
}

function isNumericId(value: string): boolean {
  return /^\d+$/.test(value);
}

function validateRow(row: CsvRow, rowIndex: number): ParsedTeam | null {
  const divisionRaw = cell(row, H.division);

  // Pomiń całkowicie: pusta dywizja lub nie-cyfra (notatki Excela, sumy, puste wiersze)
  if (!divisionRaw || !/^\d+$/.test(divisionRaw)) {
    return null;
  }

  const tier = Number.parseInt(divisionRaw, 10);
  const fpl_id = cell(row, H.fplId);
  const chosen_club = cell(row, H.discordClub);
  const manager_name = cell(row, H.fplManager);
  const discord_nick = cell(row, H.discordName);
  const fpl_team_name = cell(row, H.fplTeam);
  const fee_paid = parseFeePaid(cell(row, H.paid));

  const errors: string[] = [];

  if (!fpl_id) {
    errors.push("Brak FPL ID");
  } else if (!isNumericId(fpl_id)) {
    errors.push("FPL ID nie jest liczbą");
  }

  if (!chosen_club) {
    errors.push("Brak Discord Club");
  }

  if (!manager_name) {
    errors.push("Brak FPL Manager");
  }

  return {
    rowIndex,
    tier,
    fpl_team_name,
    manager_name: manager_name || "—",
    fpl_id: fpl_id || "—",
    discord_nick: discord_nick || "—",
    chosen_club: chosen_club || "—",
    fee_paid,
    isValid: errors.length === 0,
    errors,
  };
}

function parseCsvFile(file: File): Promise<ParsedTeam[]> {
  return new Promise((resolve, reject) => {
    if (typeof Papa?.parse !== "function") {
      reject(new Error("Biblioteka CSV nie załadowała się. Odśwież stronę (Ctrl+Shift+R)."));
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        try {
          if (results.errors?.length) {
            const fatal = results.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
            if (fatal) {
              reject(new Error(`CSV: ${fatal.message}`));
              return;
            }
          }

          const parsed: ParsedTeam[] = [];
          results.data.forEach((row, idx) => {
            const item = validateRow(row, idx + 2); // +2 = nagłówek + 1-based
            if (item) parsed.push(item);
          });
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

export function CsvImport({ seasons, pyramids, logos = [] }: CsvImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [seasonId, setSeasonId] = useState("");
  const [pyramidId, setPyramidId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedTeam[]>([]);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (seasons.length === 1) setSeasonId(seasons[0].id);
    if (pyramids.length === 1) setPyramidId(pyramids[0].id);
  }, [seasons, pyramids]);

  const ready = seasons.length > 0 && pyramids.length > 0;
  const validRows = useMemo(() => rows.filter((r) => r.isValid), [rows]);
  const invalidRows = useMemo(() => rows.filter((r) => !r.isValid), [rows]);

  const selectClass =
    "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#39FF14]";

  async function onFileSelected(file: File | null) {
    setToast(null);
    setRows([]);
    setFileName(null);
    if (!file) return;

    setParsing(true);
    setFileName(file.name);

    try {
      const parsed = await parseCsvFile(file);
      setRows(parsed);

      if (parsed.length === 0) {
        setToast({
          type: "err",
          text: "Plik nie zawiera żadnych wierszy z poprawną kolumną Dywizja (liczba 1, 2, …). Sprawdź nagłówki i separator.",
        });
      } else {
        setToast({
          type: "ok",
          text: `Wczytano ${parsed.length} wierszy (${parsed.filter((r) => r.isValid).length} OK).`,
        });
      }
    } catch (e) {
      console.error("[CsvImport] parse:", e);
      setToast({
        type: "err",
        text: e instanceof Error ? e.message : "Błąd parsowania CSV.",
      });
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!seasonId || !pyramidId) {
      setToast({ type: "err", text: "Wybierz sezon i piramidę przed importem." });
      return;
    }

    if (validRows.length === 0) {
      setToast({ type: "err", text: "Brak poprawnych wierszy do importu." });
      return;
    }

    setCommitting(true);
    setToast(null);

    try {
      const payload = validRows.map((r) => ({
        tier: r.tier,
        manager_name: r.manager_name,
        discord_nick: r.discord_nick === "—" ? r.manager_name : r.discord_nick,
        fpl_id: r.fpl_id,
        fpl_team_name: r.fpl_team_name,
        chosen_club: r.chosen_club,
        fee_paid: r.fee_paid,
      }));

      const result = await bulkUpsertTeams(payload, seasonId, pyramidId);

      if (result.error) {
        setToast({ type: "err", text: result.error });
      } else {
        setToast({ type: "ok", text: result.success ?? "Import zakończony." });
        setRows([]);
        setFileName(null);
      }
    } catch (e) {
      console.error("[CsvImport] commit:", e);
      setToast({
        type: "err",
        text: e instanceof Error ? e.message : "Nieznany błąd podczas zapisu.",
      });
    } finally {
      setCommitting(false);
    }
  }

  const canConfirm =
    Boolean(seasonId && pyramidId) && validRows.length > 0 && !committing && !parsing;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#39FF14]/10">
            <FileSpreadsheet className="h-5 w-5 text-[#39FF14]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Import CSV (Dry-Run)</h2>
            <p className="mt-1 text-sm text-slate-400">
              Krok 1: podgląd i walidacja. Krok 2: potwierdzenie zapisuje tylko poprawne wiersze
              (UPSERT po FPL ID).
            </p>
          </div>
        </div>

        {!hydrated && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            Ładowanie skryptów strony… Jeśli ten komunikat nie znika, zrób twarde odświeżenie
            (Ctrl+Shift+R) i upewnij się, że działa tylko jeden <code>npm run dev</code>.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Wybierz Sezon
            </label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={selectClass}
              disabled={!ready || committing || !hydrated}
            >
              <option value="">Wybierz sezon…</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === "PUBLISHED" ? "Opublikowany" : "Szkic"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Wybierz Piramidę
            </label>
            <select
              value={pyramidId}
              onChange={(e) => setPyramidId(e.target.value)}
              className={selectClass}
              disabled={!ready || committing || !hydrated}
            >
              <option value="">Wybierz piramidę…</option>
              {pyramids.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 transition-colors ${
            fileName
              ? "border-[#39FF14]/40 bg-[#39FF14]/5"
              : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
          } ${!hydrated ? "pointer-events-none opacity-50" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0] ?? null;
            void onFileSelected(file);
          }}
        >
          {parsing ? (
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#39FF14]" />
          ) : (
            <Upload className={`mb-3 h-8 w-8 ${fileName ? "text-[#39FF14]" : "text-slate-500"}`} />
          )}
          <span className="text-sm font-semibold text-white">
            {parsing ? "Parsowanie CSV…" : fileName ?? "Upuść CSV lub kliknij, aby wybrać"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            Nagłówki: Dywizja, FPL Team, FPL Manager, FPL ID, Discord Name, Discord Club, Wpłacono
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="hidden"
            disabled={parsing || committing || !hydrated}
            onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)}
          />
        </label>

        {toast && (
          <p
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              toast.type === "ok"
                ? "border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]"
                : "border-red-500/30 bg-red-950/40 text-red-300"
            }`}
            role="alert"
          >
            {toast.text}
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#39FF14]/10 px-3 py-1.5 text-xs font-bold text-[#39FF14]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Gotowe: {validRows.length}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">
              <XCircle className="h-3.5 w-3.5" />
              Błędy: {invalidRows.length}
            </span>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => void confirmImport()}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {committing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapis…
                </>
              ) : (
                `Potwierdź Import (${validRows.length} wierszy)`
              )}
            </button>
          </div>

          {invalidRows.length > 0 && (
            <PreviewTable
              title="Błędy — nie zostaną zaimportowane"
              tone="error"
              rows={invalidRows}
              logos={logos}
            />
          )}

          {validRows.length > 0 && (
            <PreviewTable title="Gotowe do importu" tone="ok" rows={validRows} logos={logos} />
          )}
        </div>
      )}
    </section>
  );
}

function PreviewTable({
  title,
  tone,
  rows,
  logos,
}: {
  title: string;
  tone: "ok" | "error";
  rows: ParsedTeam[];
  logos: ClubLogoRecord[];
}) {
  const border = tone === "ok" ? "border-[#39FF14]/25" : "border-red-500/30";
  const headerBg = tone === "ok" ? "bg-[#39FF14]/5" : "bg-red-950/30";
  const titleColor = tone === "ok" ? "text-[#39FF14]" : "text-red-300";

  return (
    <div className={`overflow-hidden rounded-2xl border ${border} bg-slate-800/50`}>
      <header className={`flex items-center gap-2 border-b ${border} ${headerBg} px-5 py-3`}>
        {tone === "ok" ? (
          <CheckCircle2 className={`h-4 w-4 ${titleColor}`} />
        ) : (
          <AlertTriangle className={`h-4 w-4 ${titleColor}`} />
        )}
        <h3 className={`text-sm font-bold ${titleColor}`}>
          {title} ({rows.length})
        </h3>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-700/40 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">Wiersz</th>
              <th className="px-4 py-3 font-bold">Dywizja</th>
              <th className="px-4 py-3 font-bold">Manager</th>
              <th className="px-4 py-3 font-bold">FPL ID</th>
              <th className="px-4 py-3 font-bold">Discord</th>
              <th className="px-4 py-3 font-bold">Klub</th>
              <th className="px-4 py-3 font-bold">Wpisowe</th>
              {tone === "error" && <th className="px-4 py-3 font-bold">Błędy</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {rows.map((r) => (
              <tr
                key={`${r.rowIndex}-${r.fpl_id}`}
                className={tone === "error" ? "bg-red-950/20" : "hover:bg-slate-900/40"}
              >
                <td className="px-4 py-2.5 font-mono text-slate-500">{r.rowIndex}</td>
                <td className="px-4 py-2.5 font-mono text-[#39FF14]">{r.tier}</td>
                <td className="px-4 py-2.5 text-white">{r.manager_name}</td>
                <td className="px-4 py-2.5 font-mono text-slate-300">{r.fpl_id}</td>
                <td className="px-4 py-2.5 text-slate-300">{r.discord_nick}</td>
                <td className="px-4 py-1.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ClubLogo
                      src={resolveLogoSrc(logos, r.chosen_club)}
                      clubName={r.chosen_club}
                      size="md"
                    />
                    <span className="truncate text-slate-300">{r.chosen_club}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {r.fee_paid ? (
                    <span className="text-xs font-bold text-[#39FF14]">TAK</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">NIE</span>
                  )}
                </td>
                {tone === "error" && (
                  <td className="px-4 py-2.5 text-xs text-red-300">{r.errors.join(" · ")}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
