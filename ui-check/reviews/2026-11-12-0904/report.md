## UI review: noahairmet.com (home, writing, essay at 1440 and 390)

The source moved under the review: two commits landed while I measured (bars now drawn by agents, the "Edition N" column dropped, a "Sound off" toggle and a `rev` stamp added). Every measurement below is from the live page after those commits. The 09:04 screenshots predate them, so two findings have no crop.

### Findings, most severe first

1. **Writing and essay, 390. `.bar .home` wraps to two lines.** The home link renders as "Noah" over "Airmet" (two line rects at y 7.25 and 29; the link is squeezed to 100.5px against its natural 114.7px, and the four items need about 382px in a 368px row). Shots: `writing-390-closed--1-bar.png`, `essay-390-closed--1-bar.png`. Fix: `white-space: nowrap` on `.bar .home` and a 16px nav gap under 860px.

2. **Home, 1440. End-aligned rows don't share a baseline.** The lede's last line bottom is 845.9 while the links' text bottom is 834.3 (baselines 835.9 vs 826.2, a 9.7px gap). Same in `.proj-head`: say 1276 vs Method 1265.2 (8.9px). The 44px link plates are aligned by box, not text. Shots: `home-1440-closed--3-top.png`, `--6-proj-head.png`. Fix: `align-items: last baseline` on `.foot` and `.proj-head`.

3. **Home, 1440. Colophon links float above the editions.** Last edition line text bottom 3976.3, RSS text bottom 3966.5 (9.8px). Shot: `home-1440-closed--12-colophon.png`. Fix: same baseline alignment, or give `.col-links a` the editions' 24.7px line box.

4. **Home, 390. `.check-foot` leaves "Another" alone at the right.** The empty `#q-why` (w 259, h 0, `flex: 1 1 16rem`) pushes the button to x=299 on a third row; the rows stack verdict (21.8 tall), source link (44 tall), button, so the gaps read 19px then 8px. Shot: `home-390-closed.png` (no crop covers it). Fix: `.why:empty { display: none }`, verdict and button on one row with the source beneath.

5. **Home, 1440. The bar's two sides use different gaps.** Nav links sit 24px apart (96.8 to 120.8), but "Sound off" to "Intact" is 16px (1308.6 to 1324.6). Not in the shots (added after). Fix: `.status { gap: var(--s-5) }`.

6. **Home, both widths. The "0" scale label is set differently from the rest.** It spans 323.8 to 331 (centre 3.6px right of its line) while 25/50/75/100 are centred on theirs; at 390 it's 16 to 23.2. Shot: `home-1440-closed--5-work.png`. Fix: centre it too; the 1.8px it would cross into the gutter at 390 is fine.

7. **Section and page titles are one component drawn two ways.** Home `h2`: 120px, line-height 0.86, 16.8px bottom padding. `.page-title`: 108.16px, 0.88, no padding. At 390 the page title (40.96px) is larger than the home headings (36.9px). Shots: `writing-1440-closed--3-page-title.png` vs `home-1440-closed--6-proj-head.png`. Fix: one size rule and one line-height for both.

8. **Judgment, all pages. Five bold weights for small labels.** Roles 600, prose `h2` 700, bar home 800, `.val b` and `.peak-name` 900, display 1000. Fix: one bold (600) for every 13 to 17px label, 900 kept for the two 24px marks.

9. **Home, 390. The hero holds a 311px void.** Roles end at 380.5, the lede starts at 691.4, with only three cursors between, because `.hero` keeps `min-height: 100svh`. Judgment, measured. Shot: `home-390-closed.png`. Fix: drop the min-height under 860px.

10. **Home, both widths. The `rev` stamp is a third type size in the link row.** 11px mono beside 13px links; at 390 it wraps as a fourth item after RSS. Judgment. Fix: set it as a fourth editions line at 13px, or leave it out.

11. **Essay vs home. `.say` has two widths.** 30ch (611.8px) in `.article-head`, 34ch (693.4px) on the home page. Measured, low. Fix: one max-width.

### Clean

The essay body (both widths) is clean: 62ch measure, 22px paragraph rhythm, 37.4/10px around headings, left edges all at the gutter. The writing list is clean apart from items 1 and 7. Right edges on the home page all meet the gutter at 1388.2, and the display headings' optical left offset (48.8 against 51.8) is deliberate and consistent. The name's pieces stay inside the gutter at both widths (max right 1388.1 and 373.9).

### Confidence

Items 1 to 7 and 11 are measured and I'm confident in them. Items 8, 9 and 10 are taste calls a human designer should confirm. Two things in the screenshots are not findings: the bench bars show at 0 because the figure draws on scroll and the still shot never scrolls, and the mountain is blank because `#peak` is masked by the ui-check config. One item I computed from font metrics rather than measured: the roles column's cap line sits about 16px below the name's cap line (108.7 vs 92.5), which a designer should confirm by eye before anyone moves it.
