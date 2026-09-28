# Concept prototypes (2026-09-28)

Three throwaway sketches for the "fun, zero-scroll" direction. Not part of
the Astro build; they load Google Fonts and inline JS, which the real site
must not. Serve this folder and open each page:

```bash
python3 -m http.server 4391 --directory design-kit/concepts
```

- `timp.html` — Mt Timpanogos as a live ridgeline from real USGS elevation
  (`timp.json`); drag to rotate; palette follows the real sun over Provo;
  scrub the day bar.
- `dots.html` — all 12,162 Pulpit sermons as dots (`sermons.json`, from the
  live archive-data.json); hover lens shows the real sermon, click opens it;
  speaker search; decade/source layouts.
- `desk.html` — draggable desk objects on a cutting mat: flip card, Pulpit
  index card, real résumé page, agent-bus terminal (real CLI syntax),
  Timp ticket, security key.
