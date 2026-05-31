"""Sync league dominance stats into players.ts from wyniki_meczy.json."""
import json
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WYNIKI = os.path.join(BASE, "wyniki_meczy.json")
PLAYERS_TS = os.path.join(BASE, "src", "data", "players.ts")


def compute():
    with open(WYNIKI, encoding="utf-8") as f:
        blocks = json.load(f)

    all_teams = set()
    team_points_by_gw = {}
    cum_pts = {}
    positions_by_team = {}

    for block in blocks:
        gw = block["gw"]
        team_points_by_gw[gw] = {}
        for m in block.get("matches", []):
            ta, tb = m["teamA"], m["teamB"]
            pa, pb = int(m["pointsA"]), int(m["pointsB"])
            team_points_by_gw[gw][ta] = pa
            team_points_by_gw[gw][tb] = pb
            all_teams.add(ta)
            all_teams.add(tb)

    for t in all_teams:
        cum_pts[t] = {"pts": 0, "score": 0}
        positions_by_team[t] = []

    top_scorer_counts = {t: 0 for t in all_teams}
    for gw, teams in team_points_by_gw.items():
        if not teams:
            continue
        best = max(teams.values())
        for team, pts in teams.items():
            if pts == best:
                top_scorer_counts[team] += 1

    win_streaks = {}
    loss_streaks = {}

    for block in sorted(blocks, key=lambda b: b["gw"]):
        gw = block["gw"]
        for m in block.get("matches", []):
            ta, tb = m["teamA"], m["teamB"]
            pa, pb = int(m["pointsA"]), int(m["pointsB"])
            cum_pts[ta]["score"] += pa
            cum_pts[tb]["score"] += pb
            if pa > pb:
                cum_pts[ta]["pts"] += 3
            elif pb > pa:
                cum_pts[tb]["pts"] += 3
            else:
                cum_pts[ta]["pts"] += 1
                cum_pts[tb]["pts"] += 1

        ranked = sorted(cum_pts.items(), key=lambda x: (-x[1]["pts"], -x[1]["score"]))
        n = len(ranked)
        for pos, (team, _) in enumerate(ranked, 1):
            positions_by_team[team].append(pos)

    team_outcomes = {t: [] for t in all_teams}
    for block in sorted(blocks, key=lambda b: b["gw"]):
        gw = block["gw"]
        for m in block.get("matches", []):
            ta, tb = m["teamA"], m["teamB"]
            pa, pb = int(m["pointsA"]), int(m["pointsB"])
            oa = "W" if pa > pb else ("L" if pa < pb else "D")
            ob = "W" if pb > pa else ("L" if pb < pa else "D")
            team_outcomes[ta].append((gw, oa))
            team_outcomes[tb].append((gw, ob))

    def longest(outcomes, pred):
        best = (0, None, None)
        cur = start = 0
        for gw, o in outcomes:
            if pred(o):
                if cur == 0:
                    start = gw
                cur += 1
                if cur > best[0]:
                    best = (cur, start, gw)
            else:
                cur = 0
        return best

    stats_by_team = {}
    n = len(all_teams)
    for t in all_teams:
        wl = longest(team_outcomes[t], lambda o: o == "W")
        ll = longest(team_outcomes[t], lambda o: o == "L")
        avg = round(sum(positions_by_team[t]) / len(positions_by_team[t]), 2)
        stats_by_team[t] = {
            "weeksTop": sum(1 for p in positions_by_team[t] if p == 1),
            "weeksBottom": sum(1 for p in positions_by_team[t] if p == n),
            "avgPosition": avg,
            "weeklyTopScorerCount": top_scorer_counts.get(t, 0),
            "winStreak": wl,
            "lossStreak": ll,
        }
    return stats_by_team


def patch_players(stats):
    text = open(PLAYERS_TS, encoding="utf-8").read()
    for team, s in stats.items():
        wt, wb = s["weeksTop"], s["weeksBottom"]
        avg = s["avgPosition"]
        wlen, wstart, wend = s["winStreak"]
        win_str = f"{wlen} (GW{wstart} - GW{wend})" if wlen else "0"

        pattern = rf'(team:\s*"{re.escape(team)}"[^}}]*?avgPosition:\s*)[\d.]+'
        text, n1 = re.subn(pattern, rf"\g<1>{avg}", text, count=1)

        pattern = rf'(team:\s*"{re.escape(team)}"[^}}]*?winStreak:\s*")[^"]*(")'
        text, n2 = re.subn(pattern, rf"\g<1>{win_str}\2", text, count=1)

        pattern = rf'(team:\s*"{re.escape(team)}"[^}}]*?weeksTop:\s*)\d+'
        text, n3 = re.subn(pattern, rf"\g<1>{wt}", text, count=1)

        pattern = rf'(team:\s*"{re.escape(team)}"[^}}]*?weeksBottom:\s*)\d+'
        text, n4 = re.subn(pattern, rf"\g<1>{wb}", text, count=1)

    open(PLAYERS_TS, "w", encoding="utf-8").write(text)
    print(f"Zaktualizowano {len(stats)} drużyn w players.ts")


if __name__ == "__main__":
    patch_players(compute())
