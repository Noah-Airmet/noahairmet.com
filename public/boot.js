// Runs before first paint, on every page.
(function () {
  var d = document.documentElement;
  // The visitor's own choice of day or night, if they made one.
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") d.setAttribute("data-theme", t);
  } catch (e) {}
  // On pages with the board and motion allowed, the name is set in pieces, so
  // the plain text steps aside; if the board never arrives, the text comes back.
  if (!d.hasAttribute("data-board") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  d.classList.add("live");
  setTimeout(function () {
    if (!d.classList.contains("set")) d.classList.remove("live");
  }, 3500);
})();
