"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import {
  KNOWLEDGE_BASE,
  filterKnowledgeBlocks,
  type KnowledgeHelpAnchor,
  type KnowledgeTabId,
  tabForHelpAnchor,
} from "@/lib/stats-lab/knowledgeBaseContent";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import { getThemeTokens } from "@/lib/stats-lab/themeTokens";

type Props = {
  open: boolean;
  lang: StatsLabLang;
  themeId?: StatsLabChartThemeId;
  initialTab?: KnowledgeTabId;
  helpAnchor?: KnowledgeHelpAnchor | null;
  onLangChange: (lang: StatsLabLang) => void;
  onClose: () => void;
};

export function StatsLabKnowledgeBaseModal({
  open,
  lang,
  themeId = "ARENA_DARK",
  initialTab,
  helpAnchor,
  onLangChange,
  onClose,
}: Props) {
  const pack = KNOWLEDGE_BASE[lang];
  const tokens = getThemeTokens(themeId);
  const [tabId, setTabId] = useState<KnowledgeTabId>(
    initialTab ?? "HOW_TO_USE",
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const next =
      helpAnchor != null
        ? tabForHelpAnchor(helpAnchor)
        : (initialTab ?? "HOW_TO_USE");
    setTabId(next);
    setQuery("");
  }, [open, helpAnchor, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeTab = useMemo(
    () => pack.tabs.find((t) => t.id === tabId) ?? pack.tabs[0],
    [pack.tabs, tabId],
  );

  const blocks = useMemo(
    () => filterKnowledgeBlocks(activeTab, query),
    [activeTab, query],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={pack.title}
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full max-w-2xl flex-col border-l shadow-2xl ${tokens.page} ${tokens.pageBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={`flex items-start gap-3 border-b px-5 py-4 ${tokens.pageBorder}`}
        >
          <div className={`mt-0.5 rounded-lg p-2 ${tokens.accentSoft}`}>
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={`text-lg font-black tracking-tight ${tokens.textStrong}`}>
              📚 {pack.title}
            </h2>
            <p className={`mt-0.5 text-xs ${tokens.textMuted}`}>
              FPL Arena · Stats Lab
            </p>
          </div>
          <div
            className={`inline-flex rounded-xl border p-1 ${tokens.panelBorder} ${tokens.card}`}
          >
            <button
              type="button"
              onClick={() => onLangChange("pl")}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                lang === "pl" ? "bg-[#39FF14] text-black" : tokens.textMuted
              }`}
            >
              🇵🇱 PL
            </button>
            <button
              type="button"
              onClick={() => onLangChange("en")}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                lang === "en" ? "bg-[#39FF14] text-black" : tokens.textMuted
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg border p-2 ${tokens.panelBorder} ${tokens.textMuted} hover:opacity-80`}
            aria-label={pack.closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className={`border-b px-5 py-3 ${tokens.pageBorder}`}>
          <div className="relative">
            <Search
              className={`pointer-events-none absolute left-3 top-2.5 h-4 w-4 ${tokens.textMuted}`}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pack.searchPlaceholder}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#39FF14] ${tokens.input}`}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pack.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabId(tab.id)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                  tabId === tab.id
                    ? tokens.accentSoft + " ring-1 ring-current/30"
                    : `border ${tokens.panelBorder} ${tokens.textMuted}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className={`mb-5 text-sm leading-relaxed ${tokens.text}`}>
            {activeTab.intro}
          </p>

          {blocks.length === 0 ? (
            <p
              className={`rounded-xl border border-dashed px-4 py-10 text-center text-sm ${tokens.panelBorder} ${tokens.textMuted}`}
            >
              {pack.noResults}
            </p>
          ) : (
            <div className="space-y-5">
              {blocks.map((block) => (
                <article
                  key={block.heading}
                  className={`rounded-xl border p-4 ${
                    block.featured
                      ? `${tokens.card} ${tokens.cardBorder} ring-1 ring-emerald-500/30`
                      : `${tokens.panel} ${tokens.panelBorder}`
                  }`}
                >
                  <h3
                    className={`text-sm font-black uppercase tracking-wide ${tokens.accentText}`}
                  >
                    {block.heading}
                  </h3>
                  <div
                    className={`mt-2 space-y-2 text-sm leading-relaxed ${tokens.text}`}
                  >
                    {block.paragraphs.map((p) => (
                      <p key={p.slice(0, 48)}>{p}</p>
                    ))}
                  </div>
                  {block.bullets?.length ? (
                    <ul
                      className={`mt-3 list-disc space-y-1.5 pl-5 text-sm ${tokens.text}`}
                    >
                      {block.bullets.map((b) => (
                        <li key={b.slice(0, 48)}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {activeTab.tables?.map((table) => (
            <div
              key={table.caption}
              className={`mt-6 overflow-hidden rounded-xl border ${tokens.panelBorder}`}
            >
              <p
                className={`border-b px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${tokens.pageBorder} ${tokens.card} ${tokens.textMuted}`}
              >
                {table.caption}
              </p>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr
                    className={`text-[10px] uppercase tracking-wider ${tokens.textMuted} ${tokens.page}`}
                  >
                    <th className="px-4 py-2">{table.headers[0]}</th>
                    <th className="px-4 py-2">{table.headers[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map(([a, b]) => (
                    <tr
                      key={`${a}-${b}`}
                      className={`border-t ${tokens.pageBorder}`}
                    >
                      <td className={`px-4 py-2 ${tokens.text}`}>{a}</td>
                      <td
                        className={`px-4 py-2 font-mono font-bold ${tokens.accentText}`}
                      >
                        {b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mały przycisk (?) otwierający bazę wiedzy na wskazanej kotwicy. */
export function KnowledgeHelpButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[9px] font-black text-slate-400 hover:border-[#39FF14] hover:text-[#39FF14]"
    >
      ?
    </button>
  );
}
