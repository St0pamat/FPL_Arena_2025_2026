"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadNoBigSixLogo } from "@/lib/no-big-six/actions";

type Props = {
  entryId: number;
  teamName: string;
  disabled?: boolean;
};

export function NoBigSixTeamLogoUpload({ entryId, teamName, disabled }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;

    const input = inputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setMessage("Wybierz plik obrazu.");
      setIsError(true);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Dozwolone są tylko pliki obrazów (PNG, JPEG, WebP).");
      setIsError(true);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      setMessage(null);
      const result = await uploadNoBigSixLogo(formData, entryId);
      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        if (input) input.value = "";
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full space-y-2 border-t border-slate-800 pt-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={pending || disabled}
        aria-label={`Wgraj herb dla ${teamName}`}
        className="block w-full text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-500 hover:file:bg-slate-700 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending || disabled}
        className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Zapisywanie…" : "Zapisz herb"}
      </button>
      {message ? (
        <p
          className={`text-xs ${isError ? "text-rose-400" : "text-emerald-400"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
