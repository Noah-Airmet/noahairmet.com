"""Fake Ledger uploads for testing /api/last-out: the prototype's routes as
Watch-like tracks (lat, lon, altitude with a little GPS noise), clipped to
each area's catch circle the way Ledger will. Writes fixtures/<key>.json."""
import json, math, random, os
from datetime import datetime, timedelta, timezone

src = open("build.py").read().split("# ---------- assemble ----------")[0]
exec(src)
cfg = json.load(open("../../../public/data/last-out.json"))
areas = {a["key"]: a for a in cfg["areas"]}
random.seed(3)
os.makedirs("fixtures", exist_ok=True)

def km_(a, b):
    return dist(a, b) / 1000

jobs = {  # fixture: (area, kind, route fn, days ago)
    "timp-hike": ("timp", "hike", hike_timp, 2),
    "corner-canyon-ride": ("corner-canyon", "ride", ride_cc, 1),
    "alta-ski": ("alta", "ski", ROUTES["alta"], 3),
    "brighton-ski": ("brighton", "ski", ROUTES["brighton"], 4),
    "sundance-ski": ("sundance", "ski", ROUTES["sundance"], 5),
}
for name, (key, kind, fn, ago) in jobs.items():
    r = fn()
    allpts = [p for s in r["segs"] for p in s["pts"]]
    dem = Dem(allpts, pad=0.004, n=200)
    track = []  # (lat, lon, alt): on a lift the altitude follows the cable, not the ground
    for s in r["segs"]:
        if s["lift"]:
            a_, b_ = s["pts"][0], s["pts"][-1]; ha, hb = dem.at(a_), dem.at(b_)
            seg = resample([a_, b_], 10); n = len(seg) - 1
            track += [(p[0], p[1], ha + (hb - ha) * i / n + 12) for i, p in enumerate(seg)]
        else:
            track += [(p[0], p[1], dem.at(p)) for p in resample(s["pts"], 10)]
    a = areas[key]
    route = [[round(p[0], 6), round(p[1], 6), round(p[2] + random.gauss(0, 3), 1)] for p in track
             if km_(p, a["catch"]["center"]) <= a["catch"]["km"]]
    pts = track
    end = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(days=ago)
    dur = r["stats"]["hours"] * 3600
    body = {"id": f"fixture-{name}", "area": key, "kind": kind,
            "start": (end - timedelta(seconds=dur)).isoformat().replace("+00:00", "Z"),
            "end": end.isoformat().replace("+00:00", "Z"), "duration_s": round(dur),
            "distance_m": round(sum(length(s["pts"]) for s in r["segs"])),
            "ascent_m": round(r["stats"].get("up", 0)) or None, "route": route}
    json.dump(body, open(f"fixtures/{name}.json", "w"))
    print(name, len(pts), "->", len(route), "points kept")
