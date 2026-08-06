"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { CheckCircle2, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { deleteTierLogo, upsertTierLogo } from "@/app/admin/actions/tierLogos";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  PYRAMID_TIER_NAMES,
  TIER_LOGO_ACCEPT,
  TIER_LOGO_HINT,
  findTierLogo,
  tierLogoPublicUrl,
  type TierLogoRecord,
} from "@/lib/admin/tierLogos";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

export function TierLogoManager({ logos }: { logos: TierLogoRecord[] }) {
  const [state, formAction] = useFormState(upsertTierLogo, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string>(PYRAMID_TIER_NAMES[0]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const current = findTierLogo(logos, tierName);
  const missing = PYRAMID_TIER_NAMES.filter((name) => !findTierLogo(logos, name));

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
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

  function handleDelete(logo: TierLogoRecord) {
    if (!confirm(`Usunąć logo „${logo.tierName}”? Plik zniknie z public/tier-logos/.`)) return;
    startTransition(async () => {
      const r = await deleteTierLogo(logo.tierKey);
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
            <h2 className="text-lg font-bold text-white">Dodaj / zaktualizuj logo dywizji</h2>
            <p className="mt-1 text-sm text-slate-400">{TIER_LOGO_HINT}</p>
            <p className="mt-1 text-xs text-slate-500">
              Osobna biblioteka od herbów klubowych — tylko 5 poziomów piramidy.
            </p>
          </div>
        </div>

        {missing.length > 0 ? (
          <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Brak logo dywizji ({missing.length}/5)
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missing.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setTierName(name);
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
          <div className="sm:col-span-2 sm:max-w-lg">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Dywizja
            </label>
            <select
              name="tier_name"
              required
              value={tierName}
              onChange={(e) => {
                setTierName(e.target.value);
                clearPreview();
              }}
              className={inputClass}
            >
              {PYRAMID_TIER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                  {findTierLogo(logos, name) ? "" : " · brak logo"}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Plik logo
            </label>
            <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-600 bg-slate-900/50 p-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-slate-700/60 bg-white/5">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Podgląd logo"
                    className="max-h-24 max-w-24 object-contain p-1"
                  />
                ) : current ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tierLogoPublicUrl(current.fileName)}
                    alt={current.tierName}
                    className="max-h-24 max-w-24 object-contain p-1"
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
                    accept={TIER_LOGO_ACCEPT}
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
                ) : current ? (
                  <p className="text-xs text-amber-200/90">
                    Wybierz nowy plik, żeby podmienić logo dywizji.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    PNG z przezroczystością · max 2 MB · ~400×400
                  </p>
                )}

                {previewUrl ? (
                  <button
                    type="button"
                    onClick={clearPreview}
                    className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white"
                  >
                    Wyczyść plik
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <SubmitButton
              label={current ? "Zapisz nowe logo" : "Dodaj logo"}
              className="w-full sm:w-auto"
            />
          </div>

          {state.error ? (
            <p className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="sm:col-span-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/10 px-3 py-2 text-sm text-[#39FF14]">
              {state.success}
            </p>
          ) : null}
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Biblioteka logo dywizji ({logos.length}/5)
          </h3>
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        </div>

        {toast ? (
          <p className="mb-4 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            {toast}
          </p>
        ) : null}

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PYRAMID_TIER_NAMES.map((name, index) => {
            const logo = findTierLogo(logos, name);
            return (
              <li
                key={name}
                className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-white/5 p-1">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tierLogoPublicUrl(logo.fileName)}
                      alt={name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-mono text-xs font-black text-slate-600">D{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{name}</p>
                  <p className="truncate font-mono text-[11px] text-slate-500">
                    {logo ? logo.fileName : "brak pliku"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTierName(name);
                        clearPreview();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                    >
                      <Upload className="h-3 w-3" /> {logo ? "Podmień" : "Dodaj"}
                    </button>
                    {logo ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(logo)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3 w-3" /> Usuń
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
