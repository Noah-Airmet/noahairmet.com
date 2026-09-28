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

  // The tab icon is Timp's silhouette in the current sky's colors.
  var TIMP = "0,32 -1.0,12.9 0.4,15.3 1.8,19.0 3.3,20.3 4.7,16.9 6.1,14.5 7.5,14.0 8.9,14.3 10.3,15.1 11.8,15.8 13.2,16.5 14.6,17.1 16.0,15.2 17.4,10.5 18.8,7.3 20.3,7.0 21.7,7.1 23.1,7.1 24.5,8.1 25.9,9.5 27.3,13.2 28.8,18.8 30.2,23.5 31.6,26.1 33.0,27.0 32,32";
  function icon(p) {
    var link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (!link) return;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><clipPath id="c"><rect width="32" height="32" rx="7"/></clipPath>' +
      '<g clip-path="url(#c)"><rect width="32" height="32" fill="' + css(p.bg) + '"/><polygon points="' + TIMP + '" fill="' + css(p.ink) + '"/></g></svg>';
    var href = "data:image/svg+xml," + encodeURIComponent(svg);
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  }

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
      icon(p);
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
  // Again once the DOM is ready, in case the icon link comes after this script.
  document.addEventListener("DOMContentLoaded", function () { icon(sky.current); });
  setInterval(function () { if (!sky.offsetMinutes) sky.apply(); }, 60000);
})();
