// /api/last-out: the mountain Noah was last out on. Ledger (his iOS app)
// POSTs each new outdoor workout; this checks it against the areas in
// public/data/last-out.json, fetches the terrain for its frame from USGS
// once, and stores one ready-to-draw record in KV. The About page GETs it.
import CONFIG from "../public/data/last-out.json" with { type: "json" };

const KEY = "last-out";
const GRID = 120;
const KM_LAT = 111.0;
const MAX_BODY = 600_000;
const KINDS = new Set(["hike", "run", "ride", "ski"]);

export async function handleLastOut(request, env) {
  if (request.method === "GET" || request.method === "HEAD") {
    const body = await env.LAST_OUT.get(KEY);
    if (!body) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120" },
    });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405, { Allow: "GET, HEAD, POST" });
  if (!(await authorized(request, env))) return json({ error: "unauthorized" }, 401);
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return json({ error: "too large" }, 413);

  let act;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "too large" }, 413);
    act = validate(JSON.parse(text));
  } catch (err) {
    return json({ error: `bad activity: ${err.message}` }, 400);
  }

  const current = await env.LAST_OUT.get(KEY, "json");
  if (current && current.id !== act.id && current.end >= act.end) return json({ status: "older", kept: current.id });

  const area = CONFIG.areas.find((a) => a.key === act.area);
  if (!area || !area.kinds.includes(act.kind)) return json({ error: "not a last-out area for this kind" }, 422);
  const inside = act.route.filter((p) => km(p, area.catch.center) <= area.catch.km).length;
  if (inside < act.route.length * 0.6) return json({ error: "route is not in that area" }, 422);

  let record;
  try {
    record = await build(area, act);
  } catch (err) {
    console.error(JSON.stringify({ at: "last-out", error: String(err) }));
    return json({ error: "terrain unavailable, retry later" }, 502);
  }
  await env.LAST_OUT.put(KEY, JSON.stringify(record));
  return json({ status: "stored", id: act.id, area: area.key });
}

// ---- auth: constant-time compare of SHA-256 digests (lengths always match)
async function authorized(request, env) {
  const token = env.LAST_OUT_TOKEN;
  const got = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !got) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(got)),
    crypto.subtle.digest("SHA-256", enc.encode(token)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function validate(a) {
  const need = (ok, what) => { if (!ok) throw new Error(what); };
  need(a && typeof a === "object", "not an object");
  need(typeof a.id === "string" && a.id.length > 0 && a.id.length < 80, "id");
  need(typeof a.area === "string", "area");
  need(KINDS.has(a.kind), "kind");
  const start = Date.parse(a.start), end = Date.parse(a.end);
  need(Number.isFinite(start) && Number.isFinite(end) && end > start, "start/end");
  need(end < Date.now() + 36e5, "end is in the future");
  need(Array.isArray(a.route) && a.route.length >= 2 && a.route.length <= 5000, "route");
  const route = a.route.map((p) => {
    need(Array.isArray(p) && p.length >= 2 && p.every((x) => x === null || Number.isFinite(x)), "route point");
    need(Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180, "route point range");
    return [p[0], p[1], Number.isFinite(p[2]) ? p[2] : null];
  });
  const num = (x) => (Number.isFinite(x) && x >= 0 ? x : null);
  return {
    id: a.id, area: a.area, kind: a.kind,
    start: new Date(start).toISOString(), end: new Date(end).toISOString(),
    duration_s: num(a.duration_s) ?? (end - start) / 1000,
    distance_m: num(a.distance_m), ascent_m: num(a.ascent_m), route,
  };
}

// ---- record
async function build(area, act) {
  const f = area.frame;
  let center = f.center, size = f.km;
  if (f.fit) { // zoom the frame to the activity
    const la = act.route.map((p) => p[0]), lo = act.route.map((p) => p[1]);
    center = [(Math.min(...la) + Math.max(...la)) / 2, (Math.min(...lo) + Math.max(...lo)) / 2];
    const ext = Math.max((Math.max(...la) - Math.min(...la)) * KM_LAT,
      (Math.max(...lo) - Math.min(...lo)) * KM_LAT * Math.cos(center[0] * Math.PI / 180));
    size = Math.min(6, Math.max(2.5, ext * 1.7));
  }
  const box = bbox(center, size);
  const [elev, back] = await Promise.all([
    demGrid(box, GRID, GRID),
    area.backdrop ? demGrid(bbox(area.backdrop.center, area.backdrop.km), GRID, GRID) : null,
  ]);
  const uv = (p) => [round((p[1] - box.lon[0]) / (box.lon[1] - box.lon[0]) - 0.5), round((box.lat[1] - p[0]) / (box.lat[1] - box.lat[0]) - 0.5)];

  const alt = smoothAltitudes(act.route);
  const segs = act.kind === "ski" ? splitLifts(act.route, alt) : [{ lift: false, pts: act.route }];
  const climb = updown(alt);
  const runs = act.kind === "ski" ? segs.filter((s) => !s.lift).length : null;

  return {
    v: 1, id: act.id, area: area.key, title: area.title, kind: act.kind,
    start: act.start, end: act.end,
    staleAfter: new Date(Date.parse(act.end) + CONFIG.staleDays * 864e5).toISOString(),
    stats: {
      duration_s: Math.round(act.duration_s),
      distance_m: act.distance_m ?? Math.round(pathLength(act.route)),
      ascent_m: Math.round(act.ascent_m ?? climb.up),
      descent_m: Math.round(climb.down),
      runs,
    },
    frame: { lat: box.lat, lon: box.lon, rows: GRID, cols: GRID, elev, fade: f.fade, spin: !!f.spin, peak: uv(area.peak) },
    backdrop: area.backdrop ? {
      center: uv(area.backdrop.center), scale: area.backdrop.km / size, rows: GRID, cols: GRID, elev: back,
    } : null,
    segs: segs.map((s) => ({ lift: s.lift, uv: (s.lift ? [s.pts[0], s.pts[s.pts.length - 1]] : thin(s.pts, 20)).map(uv) })),
  };
}

// ---- route shape
function km(a, b) {
  const dy = (a[0] - b[0]) * KM_LAT, dx = (a[1] - b[1]) * KM_LAT * Math.cos(a[0] * Math.PI / 180);
  return Math.hypot(dx, dy);
}
const pathLength = (pts) => pts.reduce((s, p, i) => (i ? s + km(pts[i - 1], p) * 1000 : 0), 0);
const round = (x) => Math.round(x * 1e5) / 1e5;

function thin(pts, meters) {
  const out = [pts[0]];
  for (const p of pts.slice(1, -1)) if (km(out[out.length - 1], p) * 1000 >= meters) out.push(p);
  out.push(pts[pts.length - 1]);
  return out;
}

// GPS altitude is noisy: average over ~120 m of track.
function smoothAltitudes(pts) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + km(pts[i - 1], pts[i]) * 1000);
  return pts.map((_, i) => {
    let s = 0, n = 0;
    for (let j = i; j >= 0 && d[i] - d[j] <= 60; j--) if (pts[j][2] != null) { s += pts[j][2]; n++; }
    for (let j = i + 1; j < pts.length && d[j] - d[i] <= 60; j++) if (pts[j][2] != null) { s += pts[j][2]; n++; }
    return n ? s / n : null;
  });
}

// Count climbs and drops with a 5 m dead band, the way trackers do, so
// leftover GPS jitter doesn't add up over a long day.
function updown(alt) {
  let up = 0, down = 0, ref = null;
  for (const a of alt) {
    if (a == null) continue;
    if (ref == null) { ref = a; continue; }
    if (a - ref >= 5) { up += a - ref; ref = a; }
    else if (ref - a >= 5) { down += ref - a; ref = a; }
  }
  return { up, down };
}

// A ski day alternates lifts and runs. Find the turning points where the
// track reverses by at least 60 m from its last high or low; climbing legs
// between them are lifts, and each descending leg is a run.
const TURN = 60;
function splitLifts(pts, alt) {
  const first = alt.findIndex((a) => a != null);
  if (first < 0) return [{ lift: false, pts }];
  const turns = [0];
  let hi = first, lo = first, ext = first, dir = 0;
  for (let i = first; i < pts.length; i++) {
    const a = alt[i];
    if (a == null) continue;
    if (dir === 0) {
      if (a > alt[hi]) hi = i;
      if (a < alt[lo]) lo = i;
      if (alt[hi] - alt[lo] >= TURN) {
        dir = hi > lo ? 1 : -1;
        const start = hi > lo ? lo : hi;
        if (start > 0) turns.push(start);
        ext = i;
      }
    } else if (dir > 0 ? a >= alt[ext] : a <= alt[ext]) {
      ext = i;
    } else if (Math.abs(a - alt[ext]) >= TURN) {
      turns.push(ext); dir = -dir; ext = i;
    }
  }
  turns.push(pts.length - 1);
  const segs = [];
  for (let t = 0; t + 1 < turns.length; t++) {
    const from = turns[t], to = turns[t + 1];
    if (to <= from) continue;
    const rise = (alt[to] ?? 0) - (alt[from] ?? 0);
    const lift = rise >= TURN, s = pts.slice(from, to + 1);
    const prev = segs[segs.length - 1];
    if (prev && prev.lift === lift) prev.pts.push(...s.slice(1)); else segs.push({ lift, pts: s });
  }
  return segs.length ? segs : [{ lift: false, pts }];
}

export const _test = { splitLifts, updown, smoothAltitudes, readTiffF32 };

// ---- terrain: USGS 3DEP, one request per grid
function bbox(center, sizeKm) {
  const dlat = sizeKm / 2 / KM_LAT, dlon = sizeKm / 2 / (KM_LAT * Math.cos(center[0] * Math.PI / 180));
  return { lat: [round(center[0] - dlat), round(center[0] + dlat)], lon: [round(center[1] - dlon), round(center[1] + dlon)] };
}

// ArcGIS pads the bbox to the image's aspect ratio, so fetch at the box's own
// aspect and resample to rows x cols. Rows run north to south.
export async function demGrid(box, rows, cols) {
  const k = 1000 / Math.max(box.lat[1] - box.lat[0], box.lon[1] - box.lon[0]);
  const fc = Math.max(cols, Math.round((box.lon[1] - box.lon[0]) * k));
  const fr = Math.max(rows, Math.round((box.lat[1] - box.lat[0]) * k));
  const url = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage" +
    `?bbox=${box.lon[0]},${box.lat[0]},${box.lon[1]},${box.lat[1]}&bboxSR=4326&imageSR=4326&size=${fc},${fr}` +
    "&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image";
  const res = await fetch(url, { headers: { "User-Agent": "noahairmet.com last-out" } });
  if (!res.ok) throw new Error(`3DEP ${res.status}`);
  const raw = readTiffF32(await res.arrayBuffer());
  if (raw.w !== fc || raw.h !== fr) throw new Error(`3DEP size ${raw.w}x${raw.h}`);
  const out = new Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    const y = (r / (rows - 1)) * (fr - 1), y0 = Math.min(fr - 2, Math.floor(y)), fy = y - y0;
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1)) * (fc - 1), x0 = Math.min(fc - 2, Math.floor(x)), fx = x - x0, i = y0 * fc + x0;
      const e = raw.v[i] * (1 - fx) * (1 - fy) + raw.v[i + 1] * fx * (1 - fy) + raw.v[i + fc] * (1 - fx) * fy + raw.v[i + fc + 1] * fx * fy;
      out[r * cols + c] = Math.round(e);
    }
  }
  return out;
}

function readTiffF32(buf) {
  const dv = new DataView(buf), le = dv.getUint16(0) === 0x4949;
  const u16 = (o) => dv.getUint16(o, le), u32 = (o) => dv.getUint32(o, le);
  const ifd = u32(4), n = u16(ifd), tags = {};
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + 12 * i, tag = u16(e), type = u16(e + 2), count = u32(e + 4);
    if (type !== 3 && type !== 4) continue;
    const size = type === 3 ? 2 : 4, at = count * size > 4 ? u32(e + 8) : e + 8;
    const vals = [];
    for (let j = 0; j < count; j++) vals.push(type === 3 ? u16(at + j * 2) : u32(at + j * 4));
    tags[tag] = vals;
  }
  const w = tags[256][0], h = tags[257][0], v = new Float32Array(w * h);
  const f32 = (o) => dv.getFloat32(o, le);
  if (tags[273]) { // strips
    let k = 0;
    for (let s = 0; s < tags[273].length; s++) {
      for (let o = tags[273][s], end = o + tags[279][s]; o < end && k < w * h; o += 4) v[k++] = f32(o);
    }
  } else { // tiles
    const tw = tags[322][0], th = tags[323][0], across = Math.ceil(w / tw);
    tags[324].forEach((o, t) => {
      const tx = (t % across) * tw, ty = Math.floor(t / across) * th;
      for (let r = 0; r < th && ty + r < h; r++) {
        for (let c = 0; c < tw; c++) if (tx + c < w) v[(ty + r) * w + tx + c] = f32(o + 4 * (r * tw + c));
      }
    });
  }
  return { w, h, v };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
