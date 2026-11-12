#!/usr/bin/env python3
"""Build the home page's mountains: a USGS 3DEP elevation grid for each peak
with a real hiking trail (OpenStreetMap, via Overpass) from trailhead to summit.

Writes public/data/peaks/<key>.json, src/data/peaks.json, and a contact sheet
for checking the work at scripts/.cache/peaks-check.png.

The data needs only the Python standard library. The contact sheet needs
Pillow:  pip install Pillow    (or: uv run --with pillow scripts/peaks.py)

Run from anywhere: python3 scripts/peaks.py
Downloads are cached in scripts/.cache/; delete it to refetch.

Elevation: USGS 3D Elevation Program (3DEP), public domain.
Trails: (c) OpenStreetMap contributors, ODbL.
"""
import hashlib, heapq, json, math, re, struct, sys, urllib.parse, urllib.request
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CACHE = HERE / ".cache"
OUT_DIR = ROOT / "public" / "data" / "peaks"
INDEX = ROOT / "src" / "data" / "peaks.json"
N = 120             # grid rows and cols
MAX_PTS = 400       # route points after simplification
FIT = 0.45          # furthest route point from the frame centre, as a fraction of the frame width
M_PER_DEG = 6371008.8 * math.pi / 180
UA = "terrain-build-script/1.0"

# Display order. summit: fallback if OSM has no matching natural=peak node.
# trailhead: where the hike starts; it is snapped to the nearest mapped trail.
# prefer: ways whose name matches are cheaper to route over, so the path keeps
# to the named trail rather than a shortcut. via: optional points the route
# must pass (snapped to the trail), for trails with more than one way up.
# toward_summit: 0 centres the frame on the route, 1 on the summit; the frame
# is then sized so everything fits.
PEAKS = [
    dict(key="timpanogos", name="Mount Timpanogos", elevation_ft=11749, trail="Timpooneke Trail",
         peak_name=r"^Mount Timpanogos$", summit=(40.39083, -111.64611),
         trailhead=(40.43130, -111.63890), prefer=r"Timpooneke|Timpanogos|Summit",
         osm_box=(40.36, -111.70, 40.45, -111.60), toward_summit=0.25),
    dict(key="lone-peak", name="Lone Peak", elevation_ft=11253, trail="Jacob's Ladder",
         peak_name=r"^Lone Peak$", summit=(40.52694, -111.75611),
         trailhead=(40.49880, -111.81560), prefer=r"Jacob|Lone Peak|Ghost Falls|Bonneville",
         osm_box=(40.47, -111.85, 40.545, -111.74), toward_summit=0.25),
    dict(key="olympus", name="Mount Olympus", elevation_ft=9026, trail="Mount Olympus Trail",
         peak_name=r"^Mount Olympus$", summit=(40.65611, -111.77111),
         trailhead=(40.65270, -111.80630), prefer=r"Olympus",
         osm_box=(40.635, -111.83, 40.67, -111.76), toward_summit=0.25),
    dict(key="pfeifferhorn", name="Pfeifferhorn", elevation_ft=11326, trail="Red Pine Lake Trail",
         peak_name=r"Pfeifferhorn", summit=(40.53139, -111.70528),
         trailhead=(40.57600, -111.68150), prefer=r"Red Pine|Pfeifferhorn|White Pine",
         osm_box=(40.52, -111.72, 40.59, -111.66), toward_summit=0.25),
    dict(key="nebo", name="Mount Nebo", elevation_ft=11928, trail="North Peak Trail",
         peak_name=r"^(Mount Nebo|Nebo|North Peak)", summit=(39.82194, -111.76056),
         trailhead=(39.87000, -111.72500), prefer=r"Nebo|North Peak",
         osm_box=(39.79, -111.80, 39.92, -111.68), toward_summit=0.25),
]


# ---------- geometry ----------
def dist(a, b):
    """Metres between two (lat, lon) points (haversine)."""
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(h))


def length(pts):
    return sum(dist(a, b) for a, b in zip(pts, pts[1:]))


class Local:
    """Flat metres around an origin; fine over a few km."""
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0, self.k = lat0, lon0, math.cos(math.radians(lat0))

    def xy(self, p):
        return ((p[1] - self.lon0) * M_PER_DEG * self.k, (p[0] - self.lat0) * M_PER_DEG)

    def ll(self, x, y):
        return (self.lat0 + y / M_PER_DEG, self.lon0 + x / (M_PER_DEG * self.k))


def enclosing_circle(pts):
    """Smallest circle around 2D points (Welzl, iterative)."""
    import random
    P = pts[:]
    random.Random(1).shuffle(P)

    def circ2(a, b):
        c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        return c, math.dist(a, c)

    def circ3(a, b, c):
        d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
        if abs(d) < 1e-12:
            return max((circ2(a, b), circ2(a, c), circ2(b, c)), key=lambda t: t[1])
        ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d
        uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d
        return (ux, uy), math.dist(a, (ux, uy))

    inside = lambda c, p: math.dist(c[0], p) <= c[1] + 1e-7
    c = (P[0], 0.0)
    for i in range(1, len(P)):
        if inside(c, P[i]):
            continue
        c = (P[i], 0.0)
        for j in range(i):
            if inside(c, P[j]):
                continue
            c = circ2(P[i], P[j])
            for k in range(j):
                if not inside(c, P[k]):
                    c = circ3(P[i], P[j], P[k])
    return c


def simplify(xy, tol):
    """Douglas-Peucker; returns the kept indices."""
    keep = [False] * len(xy)
    keep[0] = keep[-1] = True
    stack = [(0, len(xy) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = xy[a], xy[b]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            x, y = xy[i]
            d = abs(dy * (x - x1) - dx * (y - y1)) / L if L else math.hypot(x - x1, y - y1)
            if d > best:
                best, bi = d, i
        if bi > 0 and best > tol:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [i for i, k in enumerate(keep) if k]


# ---------- downloads ----------
def cached(name, fetch):
    CACHE.mkdir(exist_ok=True)
    f = CACHE / name
    if not f.exists():
        data = fetch()
        f.write_bytes(data)
    return f.read_bytes()


HIGHWAYS = {"path", "footway", "track", "bridleway", "steps"}


def osm(box):
    """Trails and peaks in a (south, west, north, east) box, Overpass-style JSON:
    {"elements": [{"type": "way", "tags", "geometry": [{lat, lon}]}, {"type": "node", ...}]}.
    Tries the Overpass mirrors, then falls back to the main OSM API's map call
    (fine for boxes this small) when every mirror is at capacity."""
    s, w, n, e = box
    q = f"""[out:json][timeout:120];
(
  way["highway"~"^({'|'.join(sorted(HIGHWAYS))})$"]({s},{w},{n},{e});
  node["natural"="peak"]({s},{w},{n},{e});
);
out geom tags;"""
    mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
               "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]

    def fetch():
        for u in mirrors:
            try:
                req = urllib.request.Request(u, data=urllib.parse.urlencode({"data": q}).encode(),
                                             headers={"User-Agent": UA})
                body = urllib.request.urlopen(req, timeout=60).read()
                if body[:1] == b"{":
                    print(f"  overpass ok via {u}")
                    return body
                print(f"  overpass refused by {u}")
            except Exception as ex:
                print(f"  overpass failed at {u}: {ex}")
        print("  overpass unavailable; using the OSM API map call")
        return json.dumps(osm_api(box)).encode()
    key = hashlib.sha1(q.encode()).hexdigest()[:12]
    return json.loads(cached(f"osm-{key}.json", fetch))


def osm_api(box):
    import xml.etree.ElementTree as ET
    s, w, n, e = box
    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={w},{s},{e},{n}"
    root = ET.fromstring(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=180).read())
    nodes, out = {}, []
    for nd in root.iter("node"):
        nodes[nd.get("id")] = (float(nd.get("lat")), float(nd.get("lon")))
        tags = {t.get("k"): t.get("v") for t in nd.iter("tag")}
        if tags.get("natural") == "peak":
            out.append({"type": "node", "id": int(nd.get("id")), "lat": nodes[nd.get("id")][0],
                        "lon": nodes[nd.get("id")][1], "tags": tags})
    for wy in root.iter("way"):
        tags = {t.get("k"): t.get("v") for t in wy.iter("tag")}
        if tags.get("highway") in HIGHWAYS:
            geom = [nodes[r.get("ref")] for r in wy.iter("nd") if r.get("ref") in nodes]
            out.append({"type": "way", "id": int(wy.get("id")), "tags": tags,
                        "geometry": [{"lat": a, "lon": b} for a, b in geom]})
    return {"elements": out}


def read_tiff(buf):
    """Single-band float32 GeoTIFF as ArcGIS returns it (uncompressed, strips
    or tiles). Returns (width, height, values, (lon0, lat1, dlon, dlat))."""
    bo = "<" if buf[:2] == b"II" else ">"
    (ifd,) = struct.unpack(bo + "I", buf[4:8])
    (n,) = struct.unpack(bo + "H", buf[ifd:ifd + 2])
    fmt = {3: ("H", 2), 4: ("I", 4), 12: ("d", 8)}
    tags = {}
    for i in range(n):
        e = ifd + 2 + 12 * i
        tag, typ, cnt = struct.unpack(bo + "HHI", buf[e:e + 8])
        if typ not in fmt:
            continue
        ch, size = fmt[typ]
        at = e + 8 if cnt * size <= 4 else struct.unpack(bo + "I", buf[e + 8:e + 12])[0]
        v = list(struct.unpack(bo + ch * cnt, buf[at:at + size * cnt]))
        tags[tag] = v
    w, h = tags[256][0], tags[257][0]
    assert tags.get(259, [1])[0] == 1, "compressed TIFF"
    assert tags[258][0] == 32 and tags.get(339, [3])[0] == 3, "not float32"
    out = [0.0] * (w * h)
    if 273 in tags:
        raw = b"".join(buf[o:o + c] for o, c in zip(tags[273], tags[279]))
        out = list(struct.unpack(bo + "f" * (w * h), raw[:4 * w * h]))
    else:
        tw, th, offs = tags[322][0], tags[323][0], tags[324]
        across = -(-w // tw)
        for t, o in enumerate(offs):
            tx, ty = (t % across) * tw, (t // across) * th
            vals = struct.unpack(bo + "f" * (tw * th), buf[o:o + 4 * tw * th])
            for r in range(min(th, h - ty)):
                n_ = min(tw, w - tx)
                out[(ty + r) * w + tx:(ty + r) * w + tx + n_] = vals[r * tw:r * tw + n_]
    sx, sy = tags[33550][0], tags[33550][1]
    tie = tags[33922]  # I, J, K, X, Y, Z: raster point (I, J) is at (X, Y)
    lon0, lat1 = tie[3] - tie[0] * sx, tie[4] + tie[1] * sy
    return w, h, out, (lon0, lat1, sx, sy)


class Dem:
    """A 3DEP raster over a lat/lon box, sampled bilinearly at any point."""
    def __init__(self, lat, lon, res_m=10):
        # ArcGIS pads the bbox to the image's aspect, so ask at the box's own
        # aspect in degrees and read the true extent back from the GeoTIFF.
        h = max(200, min(3000, round((lat[1] - lat[0]) * M_PER_DEG / res_m)))
        w = round(h * (lon[1] - lon[0]) / (lat[1] - lat[0]))
        url = ("https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
               f"?bbox={lon[0]},{lat[0]},{lon[1]},{lat[1]}&bboxSR=4326&imageSR=4326&size={w},{h}"
               "&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image")
        key = hashlib.sha1(url.encode()).hexdigest()[:12]
        buf = cached(f"dem-{key}.tif", lambda: urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120).read())
        self.w, self.h, self.e, (self.lon0, self.lat1, self.sx, self.sy) = read_tiff(buf)
        assert min(self.e) > -100, "nodata in elevation raster"

    def at(self, p):
        x = (p[1] - self.lon0) / self.sx - 0.5  # pixel centres
        y = (self.lat1 - p[0]) / self.sy - 0.5
        x0 = max(0, min(self.w - 2, int(math.floor(x))))
        y0 = max(0, min(self.h - 2, int(math.floor(y))))
        fx, fy = min(1, max(0, x - x0)), min(1, max(0, y - y0))
        i, e, w = y0 * self.w + x0, self.e, self.w
        return (e[i] * (1 - fx) * (1 - fy) + e[i + 1] * fx * (1 - fy)
                + e[i + w] * (1 - fx) * fy + e[i + w + 1] * fx * fy)


# ---------- trails ----------
class Graph:
    def __init__(self, ways, prefer):
        self.adj = defaultdict(list)
        self.names = {}
        rx = re.compile(prefer, re.I)
        for w in ways:
            name = w["tags"].get("name", "")
            k = 1.0 if rx.search(name) else 2.5
            pts = [(round(p["lat"], 7), round(p["lon"], 7)) for p in w["geometry"]]
            for a, b in zip(pts, pts[1:]):
                d = dist(a, b)
                self.adj[a].append((b, d * k))
                self.adj[b].append((a, d * k))
                self.names[(a, b)] = self.names[(b, a)] = name
        # Bridge tiny mapping gaps (ways that end a few metres apart), at a cost.
        cell = defaultdict(list)
        g = lambda p: (int(p[0] * 8000), int(p[1] * 6000))
        for p in self.adj:
            cell[g(p)].append(p)
        self.bridges = set()
        for p in list(self.adj):
            k0 = g(p)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    for q in cell[(k0[0] + dy, k0[1] + dx)]:
                        if q != p and dist(p, q) < 12 and all(q != r for r, _ in self.adj[p]):
                            self.adj[p].append((q, dist(p, q) * 5))
                            self.bridges.add((p, q))

    def near(self, p):
        return min(self.adj, key=lambda q: dist(p, q))

    def route(self, a, b):
        best, prev, pq = {a: 0}, {}, [(0, a)]
        while pq:
            c, u = heapq.heappop(pq)
            if u == b:
                break
            if c > best[u]:
                continue
            for v, w in self.adj[u]:
                if c + w < best.get(v, 1e18):
                    best[v] = c + w
                    prev[v] = u
                    heapq.heappush(pq, (c + w, v))
        if b != a and b not in prev:
            raise RuntimeError("no connected route")
        out = [b]
        while out[-1] != a:
            out.append(prev[out[-1]])
        return out[::-1]

    def reach(self, a):
        """Every node connected to a."""
        seen, todo = {a}, [a]
        while todo:
            u = todo.pop()
            for v, _ in self.adj[u]:
                if v not in seen:
                    seen.add(v)
                    todo.append(v)
        return seen


def trail(pk):
    data = osm(pk["osm_box"])
    ways = [x for x in data["elements"] if x["type"] == "way" and "geometry" in x]
    peaks = [x for x in data["elements"] if x["type"] == "node" and re.search(pk["peak_name"], x["tags"].get("name", ""))]
    if peaks:
        nd = min(peaks, key=lambda x: dist((x["lat"], x["lon"]), pk["summit"]))
        summit, summit_src = (nd["lat"], nd["lon"]), f"OSM node {nd['id']} ({nd['tags'].get('name')})"
    else:
        summit, summit_src = pk["summit"], "fallback coordinates"
    g = Graph(ways, pk["prefer"])
    start = g.near(pk["trailhead"])
    reach = g.reach(start)
    end = min(reach, key=lambda q: dist(q, summit))
    stops = [start] + [g.near(v) for v in pk.get("via", [])] + [end]
    pts = []
    for a, b in zip(stops, stops[1:]):
        seg = g.route(a, b)
        pts += seg if not pts else seg[1:]
    used_bridges = [(a, b) for a, b in zip(pts, pts[1:]) if (a, b) in g.bridges and (a, b) not in g.names]
    names = []
    for a, b in zip(pts, pts[1:]):
        nm = g.names.get((a, b), "(gap)") or "(unnamed)"
        if not names or names[-1][0] != nm:
            names.append([nm, 0.0])
        names[-1][1] += dist(a, b)
    return dict(pts=pts, summit=summit, summit_src=summit_src, names=names,
                bridges=[round(dist(a, b), 1) for a, b in used_bridges],
                th_snap=dist(pk["trailhead"], start))


# ---------- frames ----------
def frame_for(pk, pts, summit):
    loc = Local(*summit)
    xy = [loc.xy(p) for p in pts] + [(0.0, 0.0)]
    (cx, cy), _ = enclosing_circle(xy)
    t = pk.get("toward_summit", 0.25)
    cx, cy = cx * (1 - t), cy * (1 - t)
    far = max(math.hypot(x - cx, y - cy) for x, y in xy)
    width = max(far / FIT, pk.get("min_km", 0) * 1000)
    c = loc.ll(cx, cy)
    half_lat = width / 2 / M_PER_DEG
    half_lon = width / 2 / (M_PER_DEG * math.cos(math.radians(c[0])))
    lat = [round(c[0] - half_lat, 6), round(c[0] + half_lat, 6)]
    lon = [round(c[1] - half_lon, 6), round(c[1] + half_lon, 6)]
    return lat, lon, width


def uv(lat, lon, p):
    return ((p[1] - lon[0]) / (lon[1] - lon[0]) - 0.5, (lat[1] - p[0]) / (lat[1] - lat[0]) - 0.5)


def grid_sample(elev, u, v):
    """Bilinear sample of the N x N grid at frame coords, as the renderer does."""
    x, y = (u + 0.5) * (N - 1), (v + 0.5) * (N - 1)
    x0, y0 = max(0, min(N - 2, int(x))), max(0, min(N - 2, int(y)))
    fx, fy = x - x0, y - y0
    i = y0 * N + x0
    return (elev[i] * (1 - fx) * (1 - fy) + elev[i + 1] * fx * (1 - fy)
            + elev[i + N] * (1 - fx) * fy + elev[i + N + 1] * fx * fy)


def build(pk):
    print(f"{pk['name']}")
    t = trail(pk)
    pts, summit = t["pts"], t["summit"]
    lat, lon, width = frame_for(pk, pts, summit)
    pad = (lat[1] - lat[0]) * 0.02
    dem = Dem([lat[0] - pad, lat[1] + pad], [lon[0] - pad * 1.4, lon[1] + pad * 1.4])
    elev = []
    for r in range(N):
        for c in range(N):
            p = (lat[1] - r / (N - 1) * (lat[1] - lat[0]), lon[0] + c / (N - 1) * (lon[1] - lon[0]))
            elev.append(round(dem.at(p)))
    # simplify in local metres until it fits
    loc = Local(*summit)
    xy = [loc.xy(p) for p in pts]
    tol = 1.0
    while True:
        keep = simplify(xy, tol)
        if len(keep) <= MAX_PTS:
            break
        tol *= 1.2
    route_ll = [pts[i] for i in keep]
    route = [[round(a, 5) for a in uv(lat, lon, p)] for p in route_ll]
    peak = [round(a, 5) for a in uv(lat, lon, summit)]
    miles = length(pts) / 1609.344
    zs = [grid_sample(elev, u, v) for u, v in route]
    jumps = [abs(b - a) for a, b in zip(zs, zs[1:])]
    ji = max(range(len(jumps)), key=jumps.__getitem__)
    seg_m = [dist(a, b) for a, b in zip(route_ll, route_ll[1:])]
    fine = [dem.at(p) for p in pts]
    fine_grade = max(abs(b - a) / max(dist(p, q), 1) for a, b, p, q in zip(fine, fine[1:], pts, pts[1:]) if dist(p, q) > 8)
    rec = {"key": pk["key"], "name": pk["name"], "elevation_ft": pk["elevation_ft"], "trail": pk["trail"],
           "trail_mi": round(miles, 1), "lat": lat, "lon": lon, "rows": N, "cols": N, "elev": elev,
           "peak": peak, "route": route}
    check = dict(
        km=width / 1000, n=len(route), tol=tol, miles=miles, simp_miles=length(route_ll) / 1609.344,
        th_grid_ft=zs[0] * 3.28084, th_fine_ft=fine[0] * 3.28084,
        sum_grid_ft=grid_sample(elev, *peak) * 3.28084, sum_fine_ft=dem.at(summit) * 3.28084,
        grid_max_ft=max(elev) * 3.28084,
        max_r=max(math.hypot(u, v) for u, v in route), peak_r=math.hypot(*peak),
        end_gap_m=dist(route_ll[-1], summit), max_jump_m=jumps[ji], jump_at=ji, jump_seg_m=seg_m[ji],
        fine_grade=fine_grade, names=t["names"], bridges=t["bridges"], th_snap=t["th_snap"],
        summit_src=t["summit_src"], route_ll=route_ll, summit=summit)
    return rec, check


# ---------- contact sheet ----------
def contact_sheet(results, path):
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("Pillow not installed; skipping the contact sheet (pip install Pillow)")
        return
    S, TOP, BOT = 640, 34, 120
    cols = 3
    rows_ = -(-len(results) // cols)
    sheet = Image.new("RGB", (cols * S, rows_ * (S + TOP + BOT)), (250, 249, 245))
    try:
        font = ImageFont.load_default(size=16)
        small = ImageFont.load_default(size=13)
    except TypeError:
        font = small = ImageFont.load_default()
    for i, (rec, ck) in enumerate(results):
        e = rec["elev"]
        lo, hi = min(e), max(e)
        img = Image.new("RGB", (S, S))
        px = img.load()
        hs = [[0.0] * S for _ in range(S)]
        zz = [[0.0] * S for _ in range(S)]
        for y in range(S):
            for x in range(S):
                zz[y][x] = grid_sample(e, x / (S - 1) - 0.5, y / (S - 1) - 0.5)
        cell = ck["km"] * 1000 / (S - 1)
        az, alt = math.radians(315), math.radians(40)
        for y in range(S):
            for x in range(S):
                dzdx = (zz[y][min(S - 1, x + 1)] - zz[y][max(0, x - 1)]) / (2 * cell)
                dzdy = (zz[min(S - 1, y + 1)][x] - zz[max(0, y - 1)][x]) / (2 * cell)
                slope = math.atan(math.hypot(dzdx, dzdy))
                aspect = math.atan2(dzdy, -dzdx)
                shade = math.sin(alt) * math.cos(slope) + math.cos(alt) * math.sin(slope) * math.cos(az - aspect + math.pi / 2)
                h = (zz[y][x] - lo) / (hi - lo)
                band = int(h * 34)
                base = (120 + 110 * h, 150 + 80 * h, 110 + 120 * h)
                s = 0.35 + 0.75 * max(0, shade)
                c = [min(255, int(b * s)) for b in base]
                # contour where the band changes (34 levels, as the renderer)
                if x and y and (int((zz[y][x - 1] - lo) / (hi - lo) * 34) != band or int((zz[y - 1][x] - lo) / (hi - lo) * 34) != band):
                    c = [int(v * 0.7) for v in c]
                px[x, y] = tuple(c)
        d = ImageDraw.Draw(img)
        P = lambda u, v: ((u + 0.5) * (S - 1), (v + 0.5) * (S - 1))
        d.ellipse([0, 0, S - 1, S - 1], outline=(30, 30, 30), width=2)
        r48 = 0.48 * (S - 1)
        d.ellipse([S / 2 - r48, S / 2 - r48, S / 2 + r48, S / 2 + r48], outline=(140, 140, 140), width=1)
        pts = [P(u, v) for u, v in rec["route"]]
        d.line(pts, fill=(255, 255, 255), width=5, joint="curve")
        d.line(pts, fill=(205, 30, 30), width=3, joint="curve")
        x, y = pts[0]
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(20, 140, 60), outline=(255, 255, 255), width=2)
        x, y = P(*rec["peak"])
        d.polygon([(x, y - 11), (x - 10, y + 7), (x + 10, y + 7)], fill=(20, 20, 20), outline=(255, 255, 255))
        # scale bar: 1 km
        bar = 1000 / (ck["km"] * 1000) * (S - 1)
        d.rectangle([12, S - 22, 12 + bar, S - 16], fill=(20, 20, 20))
        d.text((14, S - 40), "1 km", fill=(20, 20, 20), font=small)
        ox, oy = (i % cols) * S, (i // cols) * (S + TOP + BOT)
        sheet.paste(img, (ox, oy + TOP))
        D = ImageDraw.Draw(sheet)
        D.text((ox + 10, oy + 8), f"{rec['name']} via {rec['trail']}", fill=(20, 20, 20), font=font)
        lines = [
            f"frame {ck['km']:.2f} km   {ck['n']} pts   {ck['miles']:.2f} mi (published {pk_pub(rec['key'])})",
            f"trailhead {ck['th_grid_ft']:.0f} ft (grid) / {ck['th_fine_ft']:.0f} ft (10 m)",
            f"summit {ck['sum_grid_ft']:.0f} ft (grid) / {ck['sum_fine_ft']:.0f} ft (10 m) vs {rec['elevation_ft']} published",
            f"max |uv| {ck['max_r']:.3f}   end-to-summit {ck['end_gap_m']:.0f} m   max jump {ck['max_jump_m']:.0f} m",
            "green = trailhead, triangle = summit, rings = cut circle and r=0.48",
        ]
        for j, ln in enumerate(lines):
            D.text((ox + 10, oy + TOP + S + 8 + j * 21), ln, fill=(40, 40, 40), font=small)
    sheet.save(path)
    print(f"contact sheet: {path}")


PUBLISHED_MI = {"timpanogos": "7.5", "lone-peak": "6.0", "olympus": "3.5", "pfeifferhorn": "4.5", "nebo": "4.7"}
pk_pub = lambda k: PUBLISHED_MI.get(k, "?")


def main():
    only = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    for pk in PEAKS:
        if only and pk["key"] not in only:
            continue
        rec, ck = build(pk)
        (OUT_DIR / f"{pk['key']}.json").write_text(json.dumps(rec, separators=(",", ":")) + "\n")
        results.append((rec, ck))
        print(f"  summit from {ck['summit_src']}; trailhead snapped {ck['th_snap']:.0f} m")
        print("  ways: " + " > ".join(f"{n} {m / 1609.344:.2f}mi" for n, m in ck["names"]))
        if ck["bridges"]:
            print(f"  gaps bridged (m): {ck['bridges']}")
        print(f"  frame {ck['km']:.2f} km, {ck['n']} pts (DP tol {ck['tol']:.1f} m), {ck['miles']:.2f} mi "
              f"(simplified {ck['simp_miles']:.2f}) vs published {pk_pub(pk['key'])}")
        print(f"  trailhead {ck['th_grid_ft']:.0f} ft grid / {ck['th_fine_ft']:.0f} ft 10 m; summit {ck['sum_grid_ft']:.0f} ft grid "
              f"/ {ck['sum_fine_ft']:.0f} ft 10 m / grid max {ck['grid_max_ft']:.0f} ft vs {pk['elevation_ft']} published")
        print(f"  max |uv| route {ck['max_r']:.3f}, summit {ck['peak_r']:.3f}; last point to summit {ck['end_gap_m']:.0f} m; "
              f"max grid jump {ck['max_jump_m']:.0f} m over {ck['jump_seg_m']:.0f} m (pt {ck['jump_at']}); "
              f"steepest 10 m-DEM grade along full path {ck['fine_grade']:.2f}")
    if not only:
        INDEX.parent.mkdir(parents=True, exist_ok=True)
        INDEX.write_text(json.dumps({"peaks": [{k: r[k] for k in ("key", "name", "elevation_ft", "trail", "trail_mi")}
                                               for r, _ in results]}, indent=2) + "\n")
    contact_sheet(results, CACHE / "peaks-check.png")


if __name__ == "__main__":
    main()
