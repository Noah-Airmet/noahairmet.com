"""Fetch a USGS 3DEP elevation grid (meters) for a lat/lon box in one request.
Rows run north→south, cols west→east — same layout as public/data/timp.json."""
import struct, sys, json, urllib.request

def read_tiff_f32(buf):
    bo = "<" if buf[:2] == b"II" else ">"
    (ifd,) = struct.unpack(bo + "I", buf[4:8])
    (n,) = struct.unpack(bo + "H", buf[ifd:ifd + 2])
    tags = {}
    for i in range(n):
        tag, typ, cnt, val = struct.unpack(bo + "HHII", buf[ifd + 2 + 12 * i: ifd + 14 + 12 * i])
        if typ == 3 and cnt == 1:
            val = val & 0xFFFF if bo == "<" else val >> 16
        if cnt > 1:  # offset to an array
            if typ not in (3, 4): continue  # geo tags etc.
            size = {3: 2, 4: 4}[typ]
            val = list(struct.unpack(bo + ("H" if typ == 3 else "I") * cnt, buf[val: val + size * cnt]))
        tags[tag] = val
    w, h = tags[256], tags[257]
    if 273 in tags:  # strips
        offs, counts = tags[273], tags[279]
        if not isinstance(offs, list): offs, counts = [offs], [counts]
        raw = b"".join(buf[o:o + c] for o, c in zip(offs, counts))
        return w, h, list(struct.unpack(bo + "f" * (w * h), raw[: 4 * w * h]))
    tw, th, offs = tags[322], tags[323], tags[324]  # tiles
    if not isinstance(offs, list): offs = [offs]
    across = -(-w // tw)
    out = [0.0] * (w * h)
    for t, o in enumerate(offs):
        tx, ty = (t % across) * tw, (t // across) * th
        vals = struct.unpack(bo + "f" * (tw * th), buf[o:o + 4 * tw * th])
        for r in range(th):
            if ty + r >= h: break
            for c in range(tw):
                if tx + c < w: out[(ty + r) * w + tx + c] = vals[r * tw + c]
    return w, h, out

def grid(lat, lon, rows, cols):
    # ArcGIS pads the bbox to the image's aspect ratio, so fetch at the box's
    # own aspect (~1 px per 3 arc-seconds / ~10 m... capped) and resample.
    k = min(4000, 1000 / max(lat[1] - lat[0], lon[1] - lon[0]) * 1)  # px per degree
    fc, fr = max(cols, round((lon[1] - lon[0]) * k)), max(rows, round((lat[1] - lat[0]) * k))
    raw = fetch(lat, lon, fr, fc)
    out = []
    for r in range(rows):
        y = r / (rows - 1) * (fr - 1); y0 = min(fr - 2, int(y)); fy = y - y0
        for c in range(cols):
            x = c / (cols - 1) * (fc - 1); x0 = min(fc - 2, int(x)); fx = x - x0
            i = y0 * fc + x0
            out.append(round(raw[i] * (1 - fx) * (1 - fy) + raw[i + 1] * fx * (1 - fy)
                             + raw[i + fc] * (1 - fx) * fy + raw[i + fc + 1] * fx * fy))
    return out

def fetch(lat, lon, rows, cols):
    url = ("https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
           f"?bbox={lon[0]},{lat[0]},{lon[1]},{lat[1]}&bboxSR=4326&imageSR=4326&size={cols},{rows}"
           "&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image")
    buf = urllib.request.urlopen(url, timeout=60).read()
    w, h, e = read_tiff_f32(buf)
    assert (w, h) == (cols, rows), (w, h)
    return e

if __name__ == "__main__":
    t = json.load(open(sys.argv[1]))
    e = grid(t["lat"], t["lon"], t["rows"], t["cols"])
    diffs = [abs(a - b) for a, b in zip(e, t["elev"])]
    print("mean |diff| m:", sum(diffs) / len(diffs), "max:", max(diffs))
    print("argmax new:", e.index(max(e)), "old:", t["elev"].index(max(t["elev"])))
