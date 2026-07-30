export const site = {
  name: "Noah Airmet",
  url: "https://noahairmet.com",
  description:
    "Cybersecurity student at BYU and junior developer at Simplicity Group, working toward technical AI governance. Field notes, written while learning.",
  email: "noah.airmet@icloud.com",
  github: "https://github.com/Noah-Airmet",
  linkedin: "https://www.linkedin.com/in/noah-airmet",
  resume: "/resume/noah-airmet-resume.pdf",
};

export type PageMeta = {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
};

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}

export function pageTitle(title?: string) {
  return title ? `${title} · ${site.name}` : site.name;
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "Jun 2026" — the compact plate-label date used in note lists. */
export function plateDate(date: Date) {
  return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "June 4, 2026" — the long form used on note pages. */
export function longDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "001", "002", … — notes are a chronological log; the number is real. */
export function noteNumber(indexFromOldest: number) {
  return String(indexFromOldest + 1).padStart(3, "0");
}
