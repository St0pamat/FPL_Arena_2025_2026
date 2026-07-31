"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { CheckCircle2, ImagePlus, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import {
  deleteClubLogo,
  renameClubLogo,
  upsertClubLogo,
} from "@/app/admin/actions/clubLogos";
import { ClubLogo } from "@/components/admin/ClubLogo";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  CLUB_LOGO_ACCEPT,
  CLUB_LOGO_HINT,
  clubLogoPublicUrl,
  findClubLogo,
  uniqueParticipantClubs,
  type ClubLogoRecord,
} from "@/lib/admin/clubLogos";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

export function ClubLogoManager({
  logos,
  participantClubs = [],
  marketingClubs = [],
}: {
  logos: ClubLogoRecord[];
  /** Unikalne chosen_club / Discord Club z zaimportowanych uczestników */
  participantClubs?: string[];
  /** Kluby ze strony reklamowej (Discord Club z bazy + kolumna S LIVE VIEW) */
  marketingClubs?: string[];
}) {
  const [state, formAction] = useFormState(upsertClubLogo, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<ClubLogoRecord | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [clubName, setClubName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const clubOptions = useMemo(() => {
    const fromParticipants = uniqueParticipantClubs(participantClubs);
    const fromMarketing = uniqueParticipantClubs(marketingClubs);
    const fromLogos = logos.map((l) => l.clubName);
    return uniqueParticipantClubs([...fromParticipants, ...fromMarketing, ...fromLogos]);
  }, [participantClubs, marketingClubs, logos]);

  const missingMarketing = useMemo(() => {
    return uniqueParticipantClubs(marketingClubs).filter((name) => !findClubLogo(logos, name));
  }, [marketingClubs, logos]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setEditing(null);
      setClubName("");
      clearPreview();
    }
  }, [state.success]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearPreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileLabel(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onFileChange(file: File | null) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!file) {
      setFileLabel(null);
      return;
    }
    setFileLabel(`${file.name} · ${(file.size / 1024).toFixed(0)} KB`);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function startEdit(logo: ClubLogoRecord) {
    setEditing(logo);
    setClubName(logo.clubName);
    setToast(null);
    clearPreview();
  }

  function handleDelete(logo: ClubLogoRecord) {
    if (!confirm(`Usunąć logo „${logo.clubName}”? Plik zniknie z public/club-logos/.`)) return;
    startTransition(async () => {
      const r = await deleteClubLogo(logo.clubKey);
      setToast(r.error ?? r.success ?? null);
      if (editing?.clubKey === logo.clubKey) {
        setEditing(null);
        setClubName("");
      }
    });
  }

  function handleRename(logo: ClubLogoRecord) {
    const next = window.prompt(
      "Nowa nazwa klubu (musi zgadzać się z Discord Club uczestnika):",
      logo.clubName,
    );
    if (!next || next.trim() === logo.clubName) return;
    startTransition(async () => {
      const r = await renameClubLogo(logo.clubKey, next);
      setToast(r.error ?? r.success ?? null);
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 sm:p-8">
        <div className="mb-5 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#39FF14]/10">
            <ImagePlus className="h-5 w-5 text-[#39FF14]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {editing ? `Zamień logo: ${editing.clubName}` : "Dodaj / zaktualizuj logo klubu"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{CLUB_LOGO_HINT}</p>
            <p className="mt-1 text-xs text-slate-500">
              Wybierz klub z listy (uczestnicy lub strona reklamowa / kolumna S), potem plik PNG —
              zobaczysz podgląd przed zapisem.
            </p>
          </div>
        </div>

        {missingMarketing.length > 0 ? (
          <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Brak herbu na stronie reklamowej ({missingMarketing.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingMarketing.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setClubName(name);
                    clearPreview();
                  }}
                  className="rounded-lg border border-amber-500/30 bg-slate-950/40 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
          {editing && <input type="hidden" name="replace_key" value={editing.clubKey} />}
          <input type="hidden" name="club_name" value={clubName} />

          <div className="sm:col-span-2 sm:max-w-lg">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Klub
            </label>
            {clubOptions.length > 0 ? (
              <select
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className={inputClass}
              >
                <option value="">Wybierz klub…</option>
                {clubOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                    {findClubLogo(logos, name) ? "" : " · brak herbu"}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                Brak klubów — zaimportuj uczestników lub poczekaj na dane z arkuszy LIVE.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Plik logo
            </label>
            <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-600 bg-slate-900/50 p-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-slate-700/60 bg-transparent">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Podgląd logo"
                    className="max-h-24 max-w-24 object-contain"
                  />
                ) : editing ? (
                  <ClubLogo
                    src={clubLogoPublicUrl(editing.fileName)}
                    clubName={editing.clubName}
                    size="hero"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-slate-600" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black hover:bg-white">
                  <Upload className="h-4 w-4" />
                  Wybierz plik
                  <input
                    ref={fileRef}
                    type="file"
                    name="logo"
                    accept={CLUB_LOGO_ACCEPT}
                    required
                    className="sr-only"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>

                {fileLabel ? (
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#39FF14]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Wczytano: {fileLabel}
                  </p>
                ) : editing ? (
                  <p className="text-xs text-amber-200/90">
                    Wybierz nowy plik, żeby podmienić crest (podgląd pojawi się po lewej).
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    PNG z przezroczystością · max 2 MB · ~400×400 — po wyborze zobaczysz podgląd.
                  </p>
                )}

                {previewUrl && (
                  <button
                    type="button"
                    onClick={clearPreview}
                    className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white"
                  >
                    Wyczyść plik
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <SubmitButton
              label={editing ? "Zapisz nowe logo" : "Dodaj logo"}
              className="w-full sm:w-auto"
            />
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setClubName("");
                  clearPreview();
                }}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900"
              >
                Anuluj edycję
              </button>
            )}
          </div>

          {state.error && (
            <p className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="sm:col-span-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/10 px-3 py-2 text-sm text-[#39FF14]">
              {state.success}
            </p>
          )}
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Biblioteka logo ({logos.length})
          </h3>
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        {toast && (
          <p className="mb-4 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            {toast}
          </p>
        )}

        {logos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700/50 px-5 py-8 text-center text-sm text-slate-500">
            Brak logo — wybierz klub z listy i dodaj crest powyżej.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {logos.map((logo) => (
              <li
                key={logo.clubKey}
                className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
              >
                <ClubLogo
                  src={clubLogoPublicUrl(logo.fileName)}
                  clubName={logo.clubName}
                  size="hero"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{logo.clubName}</p>
                  <p className="truncate font-mono text-[11px] text-slate-500">{logo.fileName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(logo)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                    >
                      <Upload className="h-3 w-3" /> Plik
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRename(logo)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                    >
                      <Pencil className="h-3 w-3" /> Nazwa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(logo)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3 w-3" /> Usuń
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
