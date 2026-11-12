// Runs before first paint, on every page.
//
// The sky. The page takes its colours from where the sun is over Provo right
// now: a drafting board by day, warming toward sunset, a blueprint by night.
// Each stop below is a whole set of tokens at one sun elevation; between stops
// of the same family the colours are mixed, and between the last light one and
// the first dark one they change over (a ground halfway between can't be read
// with either ink). window.sky lets the day bar at the foot of the page hold
// another time of day; ?at=17:10 opens the page at one.
(function () {
  var d = document.documentElement;
  var LAT = 40.2338, LON = -111.6585, RAD = Math.PI / 180;

  /** The sun's elevation over Provo, in degrees. */
  function sun(date) {
    var n = date.getTime() / 86400000 + 2440587.5 - 2451545;
    var g = (357.529 + 0.98560028 * n) * RAD;
    var L = (280.459 + 0.98564736 * n + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    var e = (23.439 - 0.00000036 * n) * RAD;
    var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    var dec = Math.asin(Math.sin(e) * Math.sin(L));
    var ha = (((18.697374558 + 24.06570982441908 * n) % 24) * 15 + LON) * RAD - ra;
    return Math.asin(Math.sin(LAT * RAD) * Math.sin(dec) + Math.cos(LAT * RAD) * Math.cos(dec) * Math.cos(ha)) / RAD;
  }

  // token order: paper, paper-2, sheet, ink, guide, guide-ink, mark, pass, fable, opus, on-agent
  var NAMES = ["paper", "paper-2", "sheet", "ink", "guide", "guide-ink", "mark", "pass", "fable", "opus", "on-agent"];
  var STOPS = [
    { at: 12, dark: 0, c: ["ecede8", "e2e3dd", "f9f9f6", "121311", "1e9bd6", "0b6aa2", "dc2a12", "12835a", "dc2a12", "2a45f0", "ffffff"] }, // day
    { at: 5, dark: 0, c: ["f2e6d3", "e9dac3", "fbf3e6", "17130e", "2a93c4", "0b6491", "d42a12", "117a54", "d42a12", "2a42e6", "ffffff"] }, // the light going gold
    { at: 0.5, dark: 0, c: ["f5d2bf", "ecc3ae", "fde4d6", "1d1218", "2f86bf", "13588a", "c9220f", "0f6f4c", "c9220f", "2a3fd6", "ffffff"] }, // the glow
    { at: -2.5, dark: 1, c: ["35215c", "42296e", "472d78", "fdeef3", "8fd8ff", "8fd8ff", "ff8a70", "7be8b8", "ff8a70", "b9c4ff", "1d1238"] }, // dusk
    { at: -8, dark: 1, c: ["16215a", "1c2a6c", "213078", "eff1fb", "6fd0f8", "6fd0f8", "ff7458", "66e2ad", "ff7458", "a6b7ff", "111a48"] }, // blue hour
    { at: -14, dark: 1, c: ["0b1a3c", "0f2250", "12265a", "eef2fa", "63cdf7", "63cdf7", "ff6a4d", "5fe0a8", "ff6a4d", "9db0ff", "0b1a3c"] }, // night
  ];
  var FLIP = -1; // the elevation at which the page goes from light to dark
  STOPS.forEach(function (s) {
    s.c = s.c.map(function (h) {
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    });
  });

  /** The tokens for a sun elevation: [dark?, colours]. */
  function tokens(el) {
    var dark = el < FLIP ? 1 : 0;
    var fam = STOPS.filter(function (s) { return s.dark === dark; });
    var a = fam[0], b = fam[fam.length - 1];
    for (var i = 0; i + 1 < fam.length; i++) if (el <= fam[i].at && el >= fam[i + 1].at) { a = fam[i]; b = fam[i + 1]; }
    if (el >= fam[0].at) b = a = fam[0];
    if (el <= fam[fam.length - 1].at) a = b = fam[fam.length - 1];
    var t = a === b ? 0 : (a.at - el) / (a.at - b.at);
    return [dark, a.c.map(function (c, i) {
      return [c[0] + (b.c[i][0] - c[0]) * t, c[1] + (b.c[i][1] - c[1]) * t, c[2] + (b.c[i][2] - c[2]) * t];
    })];
  }

  var shown = null, target = null, raf = 0;
  function paint() {
    var c = shown[1], rgb = function (v, a) {
      var s = Math.round(v[0]) + " " + Math.round(v[1]) + " " + Math.round(v[2]);
      return a == null ? "rgb(" + s + ")" : "rgb(" + s + " / " + a + ")";
    };
    for (var i = 0; i < NAMES.length; i++) d.style.setProperty("--" + NAMES[i], rgb(c[i]));
    var ink = c[3], dark = shown[0] > 0.5;
    d.style.setProperty("--ink-2", rgb(ink, 0.76));
    d.style.setProperty("--ink-3", rgb(ink, dark ? 0.66 : 0.66));
    d.style.setProperty("--rule", rgb(ink, dark ? 0.15 : 0.14));
    d.style.setProperty("--shade", dark ? "rgb(0 0 0 / 0.62)" : rgb(ink, 0.32));
    d.style.setProperty("--lift", dark ? "0 0.07em 0.08em rgb(0 0 0 / 0.5)" : "0 0.07em 0.06em " + rgb(ink, 0.3));
    d.style.colorScheme = dark ? "dark" : "light";
    var meta = document.querySelectorAll('meta[name="theme-color"]');
    for (var m = 0; m < meta.length; m++) meta[m].setAttribute("content", rgb(c[0]));
    sky.tokens = { paper: rgb(c[0]), ink: rgb(ink), guide: rgb(c[4]), mark: rgb(c[6]), dark: dark };
    document.dispatchEvent(new Event("themechange"));
  }
  // Changes after the first paint are eased, so everything on the page
  // (canvases included, which listen for themechange) turns together.
  function step() {
    var done = true, k = 0.16;
    for (var i = 0; i < target[1].length; i++) for (var j = 0; j < 3; j++) {
      var gap = target[1][i][j] - shown[1][i][j];
      if (Math.abs(gap) > 0.4) { shown[1][i][j] += gap * k; done = false; } else shown[1][i][j] = target[1][i][j];
    }
    var dg = target[0] - shown[0];
    if (Math.abs(dg) > 0.02) { shown[0] += dg * k; done = false; } else shown[0] = target[0];
    paint();
    raf = done ? 0 : requestAnimationFrame(step);
  }

  var still = /[?&]still\b/.test(location.search);
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sky = (window.sky = {
    sun: sun,
    /** The time being shown when it isn't now (the dial is holding it), else null. */
    held: null,
    tokens: null,
    /** The page's ground colour at a moment in time (the day bar draws itself with it). */
    paper: function (date) {
      var c = tokens(sun(date))[1][0];
      return "rgb(" + Math.round(c[0]) + " " + Math.round(c[1]) + " " + Math.round(c[2]) + ")";
    },
    /** Show the sky for a moment in time; pass null to go back to now. */
    show: function (date) {
      sky.held = date || null;
      var t = tokens(sun(date || new Date()));
      target = t;
      if (!shown || calm || still) { shown = [t[0], t[1].map(function (c) { return c.slice(); })]; paint(); }
      else if (!raf) raf = requestAnimationFrame(step);
    },
  });

  // ?at=HH:MM is today at that time in Provo; ?still holds noon, for screenshots and checks
  var at = /[?&]at=(\d{1,2})[:.](\d{2})/.exec(location.search);
  if (at || still) {
    var off = /GMT([+-]\d+)(?::(\d+))?/.exec(new Date().toLocaleString("en-US", { timeZone: "America/Denver", timeZoneName: "shortOffset" }));
    var offMin = off ? Number(off[1]) * 60 + (off[2] ? Number(off[2]) : 0) : -420;
    var nowP = new Date(Date.now() + offMin * 60000); // Provo's wall clock, read as UTC
    var mins = at ? Number(at[1]) * 60 + Number(at[2]) : 720;
    sky.show(new Date(Date.UTC(nowP.getUTCFullYear(), nowP.getUTCMonth(), nowP.getUTCDate()) + (mins - offMin) * 60000));
  } else sky.show(null);
  setInterval(function () { if (!sky.held) sky.show(null); }, 60000);

  // On pages with the board and motion allowed, the name is set in pieces, so
  // the plain text steps aside; if the board never arrives, the text comes back.
  if (!d.hasAttribute("data-board") || calm) return;
  d.classList.add("live");
  setTimeout(function () {
    if (!d.classList.contains("set")) d.classList.remove("live");
  }, 3500);
})();
