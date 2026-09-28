// Snapshot of Pulpit's catalog, tallied from the live archive's
// https://pulpit.restorationcommons.org/archive-data.json on 2026-09-28.
// Re-tally by decade and `fidelity` when the archive grows noticeably.

export const grades = [
  { id: "verbatim", label: "Verbatim" },
  { id: "authoritative_print", label: "Authoritative print" },
  { id: "contemporaneous_report", label: "Contemporaneous report" },
  { id: "reconstructed", label: "Reconstructed" },
  { id: "fragmentary", label: "Fragmentary" },
] as const;

export type GradeId = (typeof grades)[number]["id"];

type Counts = Record<GradeId, number>;

const row = (
  decade: number,
  verbatim: number,
  authoritative_print: number,
  contemporaneous_report: number,
  reconstructed: number,
  fragmentary: number,
) => ({
  decade,
  counts: {
    verbatim,
    authoritative_print,
    contemporaneous_report,
    reconstructed,
    fragmentary,
  } satisfies Counts,
});

export const decades = [
  row(1830, 0, 0, 1, 0, 18),
  row(1840, 0, 0, 3, 2, 15),
  row(1850, 0, 1, 604, 0, 21),
  row(1860, 0, 0, 715, 0, 20),
  row(1870, 0, 0, 397, 0, 20),
  row(1880, 0, 0, 316, 0, 2),
  row(1890, 0, 121, 188, 0, 12),
  row(1900, 0, 734, 0, 0, 2),
  row(1910, 0, 865, 1, 0, 95),
  row(1920, 0, 939, 0, 0, 3),
  row(1930, 0, 744, 0, 0, 0),
  row(1940, 0, 695, 0, 0, 0),
  row(1950, 0, 591, 0, 0, 0),
  row(1960, 0, 710, 0, 0, 0),
  row(1970, 781, 73, 0, 0, 0),
  row(1980, 700, 0, 0, 0, 0),
  row(1990, 765, 0, 0, 0, 0),
  row(2000, 780, 0, 0, 0, 0),
  row(2010, 765, 0, 0, 0, 0),
  row(2020, 463, 0, 0, 0, 0),
];

export const decadeTotal = (d: (typeof decades)[number]) =>
  grades.reduce((sum, g) => sum + d.counts[g.id], 0);

export const gradeTotal = (id: GradeId) =>
  decades.reduce((sum, d) => sum + d.counts[id], 0);

export const total = decades.reduce((sum, d) => sum + decadeTotal(d), 0);
