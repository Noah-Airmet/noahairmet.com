// Runs before first paint. With motion allowed, the name is set in pieces by
// the board, so the plain text steps aside; if the board never arrives, the
// text comes back.
(function () {
  var d = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  d.classList.add("live");
  setTimeout(function () {
    if (!d.classList.contains("set")) d.classList.remove("live");
  }, 3500);
})();
