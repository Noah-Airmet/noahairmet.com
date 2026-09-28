// The site's colors follow the real sky over Provo. Loaded synchronously in
// <head> so the first paint is already in the right light.
(function () {
  var LAT = 40.2338, LON = -111.6585, RAD = Math.PI / 180;

  // Solar elevation in degrees (NOAA low-precision formulas).
  function sunElevation(date) {
    var n = date.getTime() / 864e5 + 2440587.5 - 2451545;
    var L = (280.46 + 0.9856474 * n) % 360;
    var g = ((357.528 + 0.9856003 * n) % 360) * RAD;
    var lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    var eps = (23.439 - 4e-7 * n) * RAD;
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    var gmst = (18.697374558 + 24.06570982441908 * n) % 24;
    var ha = (gmst * 15 + LON) * RAD - ra;
    return Math.asin(Math.sin(LAT * RAD) * Math.sin(dec) + Math.cos(LAT * RAD) * Math.cos(dec) * Math.cos(ha)) / RAD;
  }

  // Two families that never blend into each other: light skies (dark ink)
  // and dark skies (light ink). Blending across them would pass through a
  // mid-gray where text disappears, so the switch at dusk is a crossfade.
  var SKY = {
    day:    { bg: [236, 240, 244], ink: [18, 28, 44],    soft: [78, 89, 110],   accent: [35, 66, 197] },
    golden: { bg: [245, 224, 204], ink: [82, 38, 22],    soft: [118, 78, 58],   accent: [152, 60, 28] },
    blue:   { bg: [36, 37, 66],    ink: [250, 206, 186], soft: [190, 176, 204], accent: [240, 140, 112] },
    night:  { bg: [11, 16, 29],    ink: [216, 224, 240], soft: [146, 158, 184], accent: [138, 168, 250] }
  };

  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function blend(a, b, t) {
    t = Math.min(1, Math.max(0, t));
    return { bg: mix(a.bg, b.bg, t), ink: mix(a.ink, b.ink, t), soft: mix(a.soft, b.soft, t), accent: mix(a.accent, b.accent, t) };
  }

  function palette(el) {
    if (el >= -4) {
      var p = blend(SKY.golden, SKY.day, (el - 0) / 9);
      p.name = el > 6 ? "day" : "golden"; p.dark = false; return p;
    }
    var q = blend(SKY.blue, SKY.night, (-el - 6) / 8);
    q.name = el > -11 ? "blue" : "night"; q.dark = true; return q;
  }

  function css(c) { return "rgb(" + c[0] + " " + c[1] + " " + c[2] + ")"; }

  var sky = {
    offsetMinutes: 0,
    sunElevation: sunElevation,
    palette: palette,
    at: function () { return new Date(Date.now() + sky.offsetMinutes * 6e4); },
    apply: function () {
      var date = sky.at(), p = palette(sunElevation(date)), root = document.documentElement;
      root.style.setProperty("--bg", css(p.bg));
      root.style.setProperty("--ink", css(p.ink));
      root.style.setProperty("--soft", css(p.soft));
      root.style.setProperty("--accent", css(p.accent));
      root.dataset.sky = p.name;
      root.style.colorScheme = p.dark ? "dark" : "light";
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", css(p.bg));
      sky.current = p;
      document.dispatchEvent(new CustomEvent("skychange", { detail: p }));
      return p;
    }
  };
  window.sky = sky;

  // ?at=21:30 previews the site at that Provo time.
  var at = /[?&]at=(\d{1,2}):?(\d{2})/.exec(location.search);
  if (at) {
    var now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Denver" }).split(":");
    sky.offsetMinutes = (+at[1] % 24) * 60 + +at[2] - ((+now[0] % 24) * 60 + +now[1]);
  }
  sky.apply();
  setInterval(function () { if (!sky.offsetMinutes) sky.apply(); }, 60000);
})();
