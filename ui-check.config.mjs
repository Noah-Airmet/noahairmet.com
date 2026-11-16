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
  // things that tick or come from the network: the quote and the live verdicts, the cited page, the mountain, the day bar (it reads the clock)
  mask: ['.check-foot', '#peak', '.q', '#sheet', '#sky'],
};
