"""Build data.js for the last-out prototype: USGS terrain for each frame, plus
one plausible (fake) route per frame routed over real OSM trails, lifts and
pistes. Run from this folder: python3 build.py"""
import heapq, json, math, random
from collections import defaultdict
from dem import grid

random.seed(7)
N = 120  # grid rows/cols per frame
KM_LAT = 111.0

def box(lat, lon, km):
    dlat = km / 2 / KM_LAT
    dlon = km / 2 / (KM_LAT * math.cos(math.radians(lat)))
    return [round(lat - dlat, 5), round(lat + dlat, 5)], [round(lon - dlon, 5), round(lon + dlon, 5)]

PEAKS = {
    "timp": (40.3908, -111.6461), "sugarloaf": (40.5659, -111.6248),
    "clayton": (40.5907, -111.5599), "brighton_up": (40.5700, -111.5790), "lone": (40.5269, -111.7561),
}

FRAMES = {
    # key: center, size km, peak that sits at the back, fade start (0..0.5)
    "timp":      dict(c=(40.3945, -111.6460), km=5.2, peak="timp", fade=0.30, title="Mount Timpanogos", spin=True),
    "sundance":  dict(c=(40.3830, -111.6120), km=8.2, peak="timp", fade=0.40, title="Sundance"),
    "sundance_b": dict(c=None, km=None, peak="timp", fade=0.34, title="Sundance", fit=True,
                       backdrop=dict(c=(40.3930, -111.6420), km=6.0)),
    "alta":      dict(c=(40.5775, -111.6255), km=5.2, peak="sugarloaf", fade=0.38, title="Alta"),
    "brighton":  dict(c=(40.5905, -111.5780), km=5.2, peak="brighton_up", fade=0.38, title="Brighton"),
    "cc_long":   dict(c=(40.5040, -111.7920), km=10.5, peak="lone", fade=0.42, title="Corner Canyon"),
    "cc_solo":   dict(c=None, km=None, peak="lone", fade=0.34, title="Corner Canyon", fit=True,
                      backdrop=dict(c=(40.5190, -111.7640), km=6.5)),
}

# ---------- graph routing over OSM ways ----------
ways = json.load(open("cache/ways.json"))["elements"]

def dist(a, b):
    dy = (a[0] - b[0]) * KM_LAT * 1000
    dx = (a[1] - b[1]) * KM_LAT * 1000 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)

class Graph:
    def __init__(self, sel, weight=lambda w, a, b: dist(a, b)):
        self.adj = defaultdict(list)
        for w in ways:
            if not sel(w["tags"]): continue
            pts = [(round(p["lat"], 6), round(p["lon"], 6)) for p in w["geometry"]]
            for a, b in zip(pts, pts[1:]):
                self.adj[a].append((b, weight(w["tags"], a, b)))
                self.adj[b].append((a, weight(w["tags"], b, a)))
        # bridge small mapping gaps
        cell = defaultdict(list)
        for p in self.adj: cell[(round(p[0] * 5000), round(p[1] * 4000))].append(p)
        for p in list(self.adj):
            k = (round(p[0] * 5000), round(p[1] * 4000))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    for q in cell[(k[0] + dy, k[1] + dx)]:
                        if q != p and dist(p, q) < 12:
                            self.adj[p].append((q, dist(p, q) * 3))

    def near(self, p):
        return min(self.adj, key=lambda q: dist(p, q))

    def route(self, a, b):
        a, b = self.near(a), self.near(b)
        best, prev, pq = {a: 0}, {}, [(0, a)]
        while pq:
            c, u = heapq.heappop(pq)
            if u == b: break
            if c > best[u]: continue
            for v, w in self.adj[u]:
                if c + w < best.get(v, 1e18):
                    best[v] = c + w; prev[v] = u; heapq.heappush(pq, (c + w, v))
        if b not in prev and a != b: raise RuntimeError(f"no route {a} -> {b}")
        out = [b]
        while out[-1] != a: out.append(prev[out[-1]])
        return out[::-1]

def through(g, stops):
    pts = []
    for a, b in zip(stops, stops[1:]):
        seg = g.route(a, b)
        pts += seg if not pts else seg[1:]
    return pts

# ---------- elevation sampling (for stats and downhill costs) ----------
class Dem:
    def __init__(self, pts, pad=0.004, n=160):
        lats, lons = [p[0] for p in pts], [p[1] for p in pts]
        self.lat = [min(lats) - pad, max(lats) + pad]; self.lon = [min(lons) - pad, max(lons) + pad]
        self.n = n; self.e = grid(self.lat, self.lon, n, n)
    def at(self, p):
        y = (self.lat[1] - p[0]) / (self.lat[1] - self.lat[0]) * (self.n - 1)
        x = (p[1] - self.lon[0]) / (self.lon[1] - self.lon[0]) * (self.n - 1)
        y0, x0 = max(0, min(self.n - 2, int(y))), max(0, min(self.n - 2, int(x)))
        fy, fx, n, e = y - y0, x - x0, self.n, self.e
        i = y0 * n + x0
        return e[i] * (1 - fx) * (1 - fy) + e[i + 1] * fx * (1 - fy) + e[i + n] * (1 - fx) * fy + e[i + n + 1] * fx * fy

def resample(pts, step=15):
    """Even spacing so elevation deltas aren't dominated by GPS-ish noise."""
    out = [pts[0]]; carry = 0.0
    for a, b in zip(pts, pts[1:]):
        d = dist(a, b)
        if d == 0: continue
        t = step - carry
        while t <= d:
            f = t / d; out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)); t += step
        carry = d - (t - step)
    out.append(pts[-1]); return out

def climb(dem, pts):
    up = down = 0.0
    hs = [dem.at(p) for p in resample(pts, 90)]  # the Watch barometer does this for real
    for a, b in zip(hs, hs[1:]):
        if b > a: up += b - a
        else: down += a - b
    return up, down

def length(pts): return sum(dist(a, b) for a, b in zip(pts, pts[1:]))

# ---------- routes ----------
def hike_timp():
    g = Graph(lambda t: t.get("highway") in ("path", "footway", "track"))
    pts = through(g, [(40.4313, -111.6391), (40.3908, -111.6461), (40.4046, -111.6052)])
    dem = Dem(pts); up, down = climb(dem, pts); km = length(pts) / 1000
    hours = km / 3.4 + up / 550
    return dict(kind="hike", segs=[dict(lift=False, pts=pts)], stats=dict(km=km, up=up, hours=hours))

def ride_cc():
    bad = ("Foot Path", "Walking", "Hiking", "Interpretive")
    def sel(t):
        n = t.get("name", "")
        return t.get("highway") in ("path", "track", "cycleway", "bridleway") and t.get("bicycle") != "no" \
            and not any(b in n for b in bad)
    def weight(t, a, b):
        d = dist(a, b)
        return d * (0.7 if t.get("mtb") == "yes" or "Trail" in t.get("name", "") else 1.3)
    g = Graph(sel, weight)
    named = defaultdict(list)
    for w in ways:
        if sel(w["tags"]) and w["tags"].get("name"):
            named[w["tags"]["name"]] += [(p["lat"], p["lon"]) for p in w["geometry"]]
    probe = Dem([p for v in named.values() for p in v if 40.45 < p[0] < 40.54 and -111.87 < p[1] < -111.74], n=140)
    hi = lambda n: max(named[n], key=probe.at)
    lo = lambda n: min(named[n], key=probe.at)
    mid = lambda n: named[n][len(named[n]) // 2]
    stops = [lo("Ghost Falls Trail"), hi("Ghost Falls Trail"), hi("Clarks Trail"), mid("Rush Trail"),
             lo("Rush Trail"), mid("Canyon Hollow Trail"), lo("Ghost Falls Trail")]
    pts = through(g, stops)
    dem = Dem(pts); up, down = climb(dem, pts); km = length(pts) / 1000
    hours = km / 11 + up / 900
    return dict(kind="ride", segs=[dict(lift=False, pts=pts)], stats=dict(km=km, up=up, hours=hours))

def ski_day(area_box, lift_names, laps):
    (la0, la1), (lo0, lo1) = area_box
    inside = lambda w: all(la0 < p["lat"] < la1 and lo0 < p["lon"] < lo1 for p in w["geometry"])
    lifts = {}
    for w in ways:
        if "aerialway" in w["tags"] and w["tags"].get("name") in lift_names and inside(w):
            g = w["geometry"]; lifts[w["tags"]["name"]] = ((g[0]["lat"], g[0]["lon"]), (g[-1]["lat"], g[-1]["lon"]))
    allpts = [p for ab in lifts.values() for p in ab]
    dem = Dem(allpts, pad=0.012, n=180)
    lifts = {k: (a, b) if dem.at(a) < dem.at(b) else (b, a) for k, (a, b) in lifts.items()}
    def weight(t, a, b):  # pistes run downhill: make climbing expensive
        d = dist(a, b); dh = dem.at(b) - dem.at(a)
        return d + max(0, dh) * 40
    g = Graph(lambda t: t.get("piste:type") == "downhill", weight)
    order = [random.choice(list(lifts)) for _ in range(laps)]
    segs, runs, drop, t_hours = [], 0, 0.0, 0.0
    for i, name in enumerate(order):
        bot, top = lifts[name]
        segs.append(dict(lift=True, pts=[bot, top]))
        t_hours += dist(bot, top) / 1000 / 9  # ~9 km/h chair
        nxt = lifts[order[i + 1]][0] if i + 1 < len(order) else lifts[order[0]][0]
        try:
            run = g.route(top, nxt)
        except RuntimeError:
            continue
        run = [top] + run + [nxt]
        segs.append(dict(lift=False, pts=run)); runs += 1
        up, down = climb(dem, run); drop += down
        t_hours += length(run) / 1000 / 14 + 0.12  # skiing + lines
    km = sum(length(s["pts"]) for s in segs) / 1000
    return dict(kind="ski", segs=segs, stats=dict(km=km, down=drop, runs=runs, hours=t_hours))

ROUTES = {}
ROUTES.update({
    "timp": hike_timp,
    "cc_long": ride_cc, "cc_solo": ride_cc,
    "alta": lambda: ski_day(((40.560, 40.600), (-111.648, -111.598)),
                            {"Collins", "Sugarloaf", "Supreme", "Wildcat", "Sunnyside"}, 11),
    "brighton": lambda: ski_day(((40.578, 40.605), (-111.600, -111.555)),
                                {"Crest Express", "Great Western Express", "Milly Express", "Snake Creek Express", "Majestic"}, 10),
    "sundance": lambda: ski_day(((40.360, 40.395), (-111.600, -111.570)),
                                {"Outlaw Express", "Red's Lift", "Electric Horseman Express", "Flathead Lift", "Wildwood Lift"}, 9),
})
ROUTES["sundance_b"] = ROUTES["sundance"]

# ---------- assemble ----------
def to_uv(fr, p):
    """lat/lon -> renderer coords u,v in -0.5..0.5 (v = -0.5 is the north edge)."""
    return [round((p[1] - fr["lon"][0]) / (fr["lon"][1] - fr["lon"][0]) - 0.5, 5),
            round((fr["lat"][1] - p[0]) / (fr["lat"][1] - fr["lat"][0]) - 0.5, 5)]

out = {}
cache = {}
for key, f in FRAMES.items():
    fn = ROUTES[key]
    r = cache.get(fn) or fn(); cache[fn] = r
    if f.get("fit"):  # zoom the frame to the route
        pts = [p for s_ in r["segs"] for p in s_["pts"]]
        la = [p[0] for p in pts]; lo_ = [p[1] for p in pts]
        f["c"] = ((min(la) + max(la)) / 2, (min(lo_) + max(lo_)) / 2)
        ext = max((max(la) - min(la)) * KM_LAT, (max(lo_) - min(lo_)) * KM_LAT * math.cos(math.radians(f["c"][0])))
        f["km"] = max(2.5, min(6.0, ext * 1.7))
    lat, lon = box(*f["c"], f["km"])
    e = grid(lat, lon, N, N)
    fr = dict(title=f["title"], km=f["km"], lat=lat, lon=lon, rows=N, cols=N, elev=e,
              fade=f["fade"], spin=f.get("spin", False))
    pk = PEAKS[f["peak"]]; fr["peak"] = to_uv(fr, pk)
    if "backdrop" in f:
        b = f["backdrop"]; blat, blon = box(*b["c"], b["km"])
        bd = dict(lat=blat, lon=blon, rows=N, cols=N, elev=grid(blat, blon, N, N))
        # where the backdrop sits relative to the frame, in frame uv units
        bd["center"] = to_uv(fr, b["c"]); bd["scale"] = b["km"] / f["km"]
        fr["backdrop"] = bd
    fr["route"] = dict(kind=r["kind"], stats={k: round(v, 2) for k, v in r["stats"].items()},
                       segs=[dict(lift=s["lift"], uv=[to_uv(fr, p) for p in (s["pts"] if s["lift"] else resample(s["pts"], 25))])
                             for s in r["segs"]])
    out[key] = fr
    print(key, fr["route"]["kind"], fr["route"]["stats"], "segs", len(fr["route"]["segs"]),
          "elev", min(e), max(e))

open("data.js", "w").write("window.LASTOUT=" + json.dumps(out, separators=(",", ":")) + ";\n")
print("wrote data.js", round(len(open("data.js").read()) / 1024), "KB")
