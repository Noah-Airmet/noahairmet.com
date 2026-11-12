#!/usr/bin/env python3
"""Copy CitationBench's published results into src/data/citationbench.json.

Reads the runs committed to ~/development/safetypage (the ones its public
leaderboard at safetypage.noahairmet.com/citationbench shows; uncommitted
result files are work in progress and stay out) and keeps the leaderboard's
three measures, each with its bootstrapped 95% interval. Run after new
results are published.
"""
import json, os, subprocess, sys

REPO = os.path.expanduser("~/development/safetypage")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "citationbench.json")
MEASURES = ["correct", "page_precision", "quote_fidelity"]
HARNESS = {"antigravity": "Antigravity", "claude": "Claude Code", "codex": "Codex", "cursor": "Cursor", "opencode": "OpenCode"}

runs = []
tracked = subprocess.run(
    ["git", "-C", REPO, "ls-files", "citationbench/results/*.json"], capture_output=True, text=True, check=True
).stdout.split()
for rel in sorted(tracked):
    d = json.load(open(os.path.join(REPO, rel)))
    if d.get("schema") != "citationbench.result/1":
        continue
    agent = (d.get("agent") or "").split()[0].lower().replace("claude-code", "claude")
    runs.append({
        "id": d["name"],
        "agent": HARNESS.get(agent, d.get("agent")),
        "model": d["model"],
        "n": d["samples"],
        "date": d["created_at"][:10],
        "snapshot": d["snapshot"],
        **{m: [round(d["measures"][m][k] * 100, 1) for k in ("mean", "ci_low", "ci_high")] for m in MEASURES},
    })

if not runs:
    sys.exit("no committed runs found in " + REPO)
runs.sort(key=lambda r: -r["correct"][0])
json.dump({"runs": runs}, open(OUT, "w"), indent=1)
print(f"{len(runs)} runs -> {os.path.normpath(OUT)}")
for r in runs:
    print(f'  {r["agent"]:<12} {r["model"]:<26} n={r["n"]} correct={r["correct"]} precision={r["page_precision"][0]} quote={r["quote_fidelity"][0]}')
