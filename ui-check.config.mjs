// ui-check (~/development/tools/ui-check): what to check on this site.
// Run against the dev server (npm run dev) or `npm run preview`.
export default {
  base: 'http://127.0.0.1:4321',
  pages: [
    { name: 'home', path: '/?still' },
    { name: 'writing', path: '/writing/' },
    { name: 'essay', path: '/writing/professional-commitments/' },
  ],
  widths: [1440, 390],
  // the board has finished setting the name
  ready: "!document.documentElement.classList.contains('live') || (document.querySelectorAll('.pc').length > 0 && [...document.querySelectorAll('.pc')].every((p) => p.dataset.s === 'set'))",
  // things that tick or come from the network: the last log line, the quote and the live verdicts, the cited page, the mountain, the day bar (it reads the clock)
  mask: ['#last', '.check-foot', '#peak', '.q', '#sheet', '#sky'],
};
