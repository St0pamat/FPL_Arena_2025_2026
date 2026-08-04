"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Loader2, Pencil, Trash2, Users, X } from "lucide-react";
import { deleteTeam, updateTeam } from "@/app/admin/actions/db";
import type { Division, Pyramid, Season, Team } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubLogo } from "@/components/admin/ClubLogo";
import { ClubField } from "@/components/admin/ClubField";
import { resolveLogoSrc } from "@/components/admin/ClubNameWithLogo";
import { SubmitButton } from "@/components/admin/SubmitButton";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

function divisionLabel(d: Division, seasons: Season[], pyramids: Pyramid[]): string {
  const season = seasons.find((s) => s.id === d.season_id)?.name ?? "Sezon?";
  const pyramid = pyramids.find((p) => p.id === d.pyramid_id)?.name ?? "Piramida?";
  return `${season} · ${pyramid} · T${d.tier} — ${d.name}`;
}
function DeleteTeamButton({ teamId }: { teamId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Usunąć tę drużynę?")) return;
        startTransition(async () => {
          const result = await deleteTeam(teamId);
          if (result.error) alert(result.error);
        });
      }}
      className="inline-flex items-center justify-center rounded-lg border border-slate-700/50 p-2 text-slate-400 transition-colors hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-50"
      aria-label="Usuń drużynę"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

function EditTeamModal({
  team,
  divisions,
  seasons,
  pyramids,
  logos,
  onClose,
}: {
  team: Team;
  divisions: Division[];
  seasons: Season[];
  pyramids: Pyramid[];
  logos: ClubLogoRecord[];
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(updateTeam, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-team-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0B0F19] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="edit-team-title" className="text-lg font-bold text-white">
            Edytuj drużynę
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={team.id} />

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Menedżer
            </label>
            <input
              name="manager_name"
              required
              defaultValue={team.manager_name}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nick Discord
            </label>
            <input
              name="discord_nick"
              required
              defaultValue={team.discord_nick}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              FPL ID
            </label>
            <input name="fpl_id" defaultValue={team.fpl_id ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nazwa drużyny FPL
            </label>
            <input
              name="fpl_team_name"
              defaultValue={team.fpl_team_name ?? ""}
              className={inputClass}
            />
          </div>

          <ClubField logos={logos} defaultValue={team.chosen_club} id={`edit-club-${team.id}`} />

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Dywizja (sezon · piramida · tier)
            </label>
            <select
              name="division_id"
              defaultValue={team.division_id ?? ""}
              className={inputClass}
            >
              <option value="">— Pula (bez dywizji) —</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {divisionLabel(d, seasons, pyramids)}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              name="fee_paid"
              defaultChecked={team.fee_paid}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#39FF14] focus:ring-[#39FF14]"
            />
            <span className="text-sm font-semibold text-slate-200">Wpisowe opłacone</span>
          </label>

          {state.error && (
            <p className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <SubmitButton label="Zapisz zmiany" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300"
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function divisionHeading(d: Division) {
  return `T${d.tier}`;
}

export function TeamsByDivision({
  teams,
  divisions,
  seasons = [],
  pyramids = [],
  logos = [],
}: {
  teams: Team[];
  divisions: Division[];
  seasons?: Season[];
  pyramids?: Pyramid[];
  logos?: ClubLogoRecord[];
}) {
  const [editing, setEditing] = useState<Team | null>(null);

  const unassigned = teams
    .filter((t) => !t.division_id)
    .sort((a, b) => a.manager_name.localeCompare(b.manager_name, "pl"));

  const sorted = [...divisions].sort((a, b) => {
    const sa = seasons.find((s) => s.id === a.season_id)?.name ?? "";
    const sb = seasons.find((s) => s.id === b.season_id)?.name ?? "";
    if (sa !== sb) return sa.localeCompare(sb, "pl");
    const pa = pyramids.find((p) => p.id === a.pyramid_id)?.name ?? "";
    const pb = pyramids.find((p) => p.id === b.pyramid_id)?.name ?? "";
    if (pa !== pb) return pa.localeCompare(pb, "pl");
    return a.tier - b.tier;
  });

  if (divisions.length === 0 && unassigned.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-800/30 p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-3 text-sm text-slate-500">
          Brak graczy. Użyj <strong>Zaimportuj z Excela</strong>, aby zapełnić bazę przed Kreatorem
          Dywizji.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditTeamModal
          team={editing}
          divisions={divisions}
          seasons={seasons}
          pyramids={pyramids}
          logos={logos}
          onClose={() => setEditing(null)}
        />
      )}

      {unassigned.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-800/50">
          <header className="flex items-center justify-between border-b border-amber-500/20 bg-amber-950/20 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                Pula przed dywizjami
              </p>
              <h3 className="mt-0.5 text-lg font-bold text-white">Bez przydziału</h3>
            </div>
            <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-200">
              {unassigned.length}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-slate-700/40 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Menedżer</th>
                  <th className="px-5 py-3 font-bold">Discord</th>
                  <th className="px-5 py-3 font-bold">FPL Team</th>
                  <th className="px-5 py-3 font-bold">FPL ID</th>
                  <th className="px-5 py-3 font-bold">OR</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {unassigned.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-900/40">
                    <td className="px-5 py-1.5 font-semibold text-white">{team.manager_name}</td>
                    <td className="px-5 py-1.5 text-slate-300">{team.discord_nick}</td>
                    <td className="px-5 py-1.5 text-slate-400">{team.fpl_team_name || "—"}</td>
                    <td className="px-5 py-1.5 font-mono text-slate-400">{team.fpl_id || "—"}</td>
                    <td className="px-5 py-1.5 font-mono text-slate-400">
                      {team.previous_season_or ?? "—"}
                    </td>
                    <td className="px-5 py-1.5">
                      {team.is_active === false ? (
                        <span className="text-xs font-bold text-slate-500">NIEAKTYWNY</span>
                      ) : (
                        <span className="text-xs font-bold text-[#39FF14]">AKTYWNY</span>
                      )}
                    </td>
                    <td className="px-5 py-1.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing(team)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-700/50 p-2 text-slate-400 transition-colors hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                          aria-label="Edytuj drużynę"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <DeleteTeamButton teamId={team.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sorted.map((division) => {
        const divisionTeams = teams.filter((t) => t.division_id === division.id);
        const seasonName = seasons.find((s) => s.id === division.season_id)?.name;
        const pyramidName = pyramids.find((p) => p.id === division.pyramid_id)?.name;

        return (
          <section
            key={division.id}
            className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 bg-slate-900/60 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#39FF14]">
                  {[seasonName, pyramidName, `Tier ${division.tier}`, divisionHeading(division)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <h3 className="mt-0.5 text-lg font-bold text-white">{division.name}</h3>
                {divisionTeams.length < 10 ? (
                  <p className="mt-1 text-xs font-semibold text-amber-300">
                    Dywizja Niepełna ({divisionTeams.length}/10). Rekrutacja w toku — bez Bergera /
                    publikacji.
                  </p>
                ) : null}
              </div>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  divisionTeams.length < 10
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {divisionTeams.length} / 10
              </span>
            </header>

            {divisionTeams.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Brak drużyn w tej dywizji.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-slate-700/40 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Menedżer</th>
                      <th className="px-5 py-3 font-bold">Discord</th>
                      <th className="px-5 py-3 font-bold">FPL ID</th>
                      <th className="px-5 py-3 font-bold">Klub</th>
                      <th className="px-5 py-3 font-bold">Wpisowe</th>
                      <th className="px-5 py-3 font-bold text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {divisionTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-slate-900/40">
                        <td className="px-5 py-1.5 font-semibold text-white">{team.manager_name}</td>
                        <td className="px-5 py-1.5 text-slate-300">{team.discord_nick}</td>
                        <td className="px-5 py-1.5 font-mono text-slate-400">{team.fpl_id || "—"}</td>
                        <td className="px-5 py-1.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ClubLogo
                              src={resolveLogoSrc(logos, team.chosen_club)}
                              clubName={team.chosen_club}
                              size="md"
                            />
                            <span className="truncate font-semibold uppercase tracking-wide text-slate-200">
                              {team.chosen_club}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-1.5">
                          {team.fee_paid ? (
                            <span className="text-xs font-bold text-[#39FF14]">TAK</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">NIE</span>
                          )}
                        </td>
                        <td className="px-5 py-1.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditing(team)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-700/50 p-2 text-slate-400 transition-colors hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                              aria-label="Edytuj drużynę"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <DeleteTeamButton teamId={team.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
