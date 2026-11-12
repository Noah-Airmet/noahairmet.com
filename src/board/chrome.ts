// The bar's day/night control, on every page. The choice is kept on this
// device; with none made, the system's setting decides.
const root = document.documentElement;
const btn = document.getElementById("theme");
const dark = matchMedia("(prefers-color-scheme: dark)");

const current = () => (root.dataset.theme as "light" | "dark" | undefined) ?? (dark.matches ? "dark" : "light");

function show() {
  const now = current();
  btn?.setAttribute("aria-pressed", String(now === "dark"));
  btn?.setAttribute("aria-label", now === "dark" ? "Night. Switch to day" : "Day. Switch to night");
  btn?.setAttribute("title", now === "dark" ? "Day" : "Night");
  // the browser's own chrome follows
  const paper = getComputedStyle(root).getPropertyValue("--paper").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", paper));
}

btn?.addEventListener("click", () => {
  const next = current() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* private mode */
  }
  show();
  document.dispatchEvent(new Event("themechange"));
});
dark.addEventListener("change", () => {
  show();
  document.dispatchEvent(new Event("themechange"));
});
show();
