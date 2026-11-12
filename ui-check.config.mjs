// ui-check (~/development/tools/ui-check): what to check on this site.
// Run against the dev server (npm run dev) or `npm run preview`.
export default {
  base: 'http://127.0.0.1:4321',
  pages: [
    { name: 'home', path: '/' },
    { name: 'writing', path: '/writing/' },
    { name: 'essay', path: '/writing/professional-commitments/' },
  ],
  widths: [1440, 390],
  // the board has finished setting the name
  ready: "!document.documentElement.classList.contains('live') || (document.querySelectorAll('.pc').length > 0 && [...document.querySelectorAll('.pc')].every((p) => p.dataset.s === 'set'))",
  // things that move or tick: the agents' cursors and lines, the last log line, the quote's live verdict
  mask: ['.board', '#last', '.check-foot', '#peak'],
};
