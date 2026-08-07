"use client";

import { useMemo, useState } from "react";
import { ClubLogo } from "@/components/admin/ClubLogo";
import {
  CLUB_LOGO_HINT,
  findClubLogo,
  resolveClubLogoSrc,
  type ClubLogoRecord,
} from "@/lib/admin/clubLogos";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

/** Pole „Wybrany klub” z podglądem logo + szybkim wyborem z biblioteki. */
export function ClubField({
  logos,
  name = "chosen_club",
  defaultValue = "",
  required = true,
  id = "chosen_club",
}: {
  logos: ClubLogoRecord[];
  name?: string;
  defaultValue?: string;
  required?: boolean;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const match = useMemo(() => findClubLogo(logos, value), [logos, value]);
  const src = match ? resolveClubLogoSrc(match) : null;

  return (
    <div className="space-y-2 sm:col-span-2">
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
        Wybrany klub angielski
      </label>
      <div className="flex items-center gap-3">
        <ClubLogo src={src} clubName={value || "?"} size="xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            id={id}
            name={name}
            required={required}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='np. Chelsea, West Ham'
            className={inputClass}
            list={`${id}-logos`}
            autoComplete="off"
          />
          <datalist id={`${id}-logos`}>
            {logos.map((l) => (
              <option key={l.clubKey} value={l.clubName} />
            ))}
          </datalist>
          {logos.length > 0 && (
            <select
              className={inputClass}
              value=""
              onChange={(e) => {
                if (e.target.value) setValue(e.target.value);
              }}
            >
              <option value="">Wybierz z biblioteki logo…</option>
              {logos.map((l) => (
                <option key={l.clubKey} value={l.clubName}>
                  {l.clubName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        {src
          ? `Logo: ${match?.fileName}`
          : `Brak logo dla tej nazwy — dodaj w „Logo klubów”. ${CLUB_LOGO_HINT}`}
      </p>
    </div>
  );
}
