"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  NO_BIG_SIX_LOGO_MAX_BYTES,
  isAllowedLogoMime,
} from "@/lib/no-big-six/logos";

type Props = {
  entryId: number;
  teamName: string;
  customLogoUrl?: string | null;
  disabled?: boolean;
};

type LogoApiResult = {
  ok?: boolean;
  message?: string;
  url?: string;
};

async function postLogo(
  formData: FormData,
): Promise<{ result: LogoApiResult | null; httpStatus: number; raw: string }> {
  const res = await fetch("/api/admin/no-big-six/logo", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });
  const raw = await res.text();
  try {
    return {
      result: JSON.parse(raw) as LogoApiResult,
      httpStatus: res.status,
      raw,
    };
  } catch {
    return { result: null, httpStatus: res.status, raw };
  }
}

async function deleteLogo(
  entryId: number,
): Promise<{ result: LogoApiResult | null; httpStatus: number; raw: string }> {
  const res = await fetch("/api/admin/no-big-six/logo", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId }),
    credentials: "same-origin",
  });
  const raw = await res.text();
  try {
    return {
      result: JSON.parse(raw) as LogoApiResult,
      httpStatus: res.status,
      raw,
    };
  } catch {
    return { result: null, httpStatus: res.status, raw };
  }
}

export function NoBigSixTeamLogoUpload({
  entryId,
  teamName,
  customLogoUrl = null,
  disabled,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasLogo = Boolean(customLogoUrl);

  function applyResult(
    result: LogoApiResult | null,
    httpStatus: number,
    raw: string,
  ): boolean {
    if (!result || typeof result.ok !== "boolean") {
      setIsError(true);
      const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 120);
      setMessage(
        `Błąd serwera (HTTP ${httpStatus})${snippet ? `: ${snippet}` : ". Sprawdź logi PM2 / nginx."}`,
      );
      return false;
    }
    setIsError(!result.ok);
    setMessage(result.message ?? (result.ok ? "OK" : "Błąd"));
    return result.ok;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || pending) return;

    try {
      const input = inputRef.current;
      const file = input?.files?.[0];
      if (!file) {
        setMessage("Wybierz plik obrazu.");
        setIsError(true);
        return;
      }

      if (!isAllowedLogoMime(file.type)) {
        setMessage("Dozwolone formaty: PNG, JPEG, WebP.");
        setIsError(true);
        return;
      }

      if (file.size > NO_BIG_SIX_LOGO_MAX_BYTES) {
        setMessage(
          `Plik jest za duży (max ${NO_BIG_SIX_LOGO_MAX_BYTES / (1024 * 1024)} MB).`,
        );
        setIsError(true);
        return;
      }

      const formData = new FormData();
      formData.set("file", file);
      formData.set("entryId", String(entryId));

      startTransition(() => {
        void (async () => {
          try {
            setMessage(null);
            const { result, httpStatus, raw } = await postLogo(formData);
            if (applyResult(result, httpStatus, raw)) {
              if (input) input.value = "";
              router.refresh();
            }
          } catch (err) {
            console.error("[NoBigSixTeamLogoUpload]", err);
            setIsError(true);
            setMessage(
              err instanceof Error
                ? err.message
                : "Nie udało się wgrać herbu. Spróbuj ponownie.",
            );
          }
        })();
      });
    } catch (err) {
      console.error("[NoBigSixTeamLogoUpload] submit", err);
      setIsError(true);
      setMessage("Błąd formularza — odśwież stronę i spróbuj ponownie.");
    }
  }

  function handleDelete() {
    if (disabled || pending || !hasLogo) return;
    startTransition(() => {
      void (async () => {
        try {
          setMessage(null);
          const { result, httpStatus, raw } = await deleteLogo(entryId);
          if (applyResult(result, httpStatus, raw)) {
            if (inputRef.current) inputRef.current.value = "";
            router.refresh();
          }
        } catch (err) {
          console.error("[NoBigSixTeamLogoUpload] delete", err);
          setIsError(true);
          setMessage(
            err instanceof Error
              ? err.message
              : "Nie udało się usunąć herbu. Spróbuj ponownie.",
          );
        }
      })();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 w-full space-y-2 border-t border-slate-800 pt-4"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={pending || disabled}
        aria-label={`Wgraj herb dla ${teamName}`}
        className="block w-full text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-500 hover:file:bg-slate-700 disabled:opacity-50"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || disabled}
          className="flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Zapisywanie…" : "Zapisz herb"}
        </button>
        {hasLogo ? (
          <button
            type="button"
            disabled={pending || disabled}
            onClick={handleDelete}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Usuń
          </button>
        ) : null}
      </div>
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
