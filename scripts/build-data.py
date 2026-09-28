"""Regenerate the home page's data files.

  python3 scripts/build-data.py

- public/data/timp.json: Mt Timpanogos elevation (USGS 10 m, resampled to
  100x100), from the old site's terrain cache in git history.
- public/data/pulpit-core.json + pulpit-titles.json: every Pulpit sermon,
  from the live archive. Core (year, grade, speaker) draws the dots; titles
  load after first paint.
"""
import json, subprocess, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

raw = subprocess.run(["git", "show", "82d485e^:scripts/terrain-cache/timpanogos.json"],
                     capture_output=True, text=True, check=True).stdout
t = json.loads(raw)
json.dump({"rows": t["rows"], "cols": t["cols"], "lat": t["lat"], "lon": t["lon"],
           "elev": [round(v) for v in t["elev"]]},
          open(OUT / "timp.json", "w"), separators=(",", ":"))

req = urllib.request.Request("https://pulpit.restorationcommons.org/archive-data.json",
                             headers={"User-Agent": "noahairmet.com build"})
d = json.load(urllib.request.urlopen(req))
f = d["fields"]; rows = d["rows"]
fi, yi, si, ti, ii = (f.index(k) for k in ("fidelity", "year", "speaker", "title", "id"))
grades = ["verbatim", "authoritative_print", "contemporaneous_report", "reconstructed", "fragmentary"]
speakers = sorted({r[si] for r in rows}); sidx = {s: k for k, s in enumerate(speakers)}
rows.sort(key=lambda r: (r[yi] // 10, grades.index(r[fi]), r[yi], r[ii]))
json.dump({"grades": grades, "speakers": speakers,
           "y": [r[yi] for r in rows], "f": [grades.index(r[fi]) for r in rows], "s": [sidx[r[si]] for r in rows]},
          open(OUT / "pulpit-core.json", "w"), separators=(",", ":"), ensure_ascii=False)
json.dump({"t": [r[ti] for r in rows], "id": [r[ii] for r in rows]},
          open(OUT / "pulpit-titles.json", "w"), separators=(",", ":"), ensure_ascii=False)
print(len(rows), "sermons")
