export const site = {
  name: "Noah Airmet",
  url: "https://noahairmet.com",
  description:
    "Cybersecurity student at BYU and junior developer at Simplicity Group, working toward technical AI governance.",
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

/** "June 2026" */
export function monthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "June 4, 2026" */
export function longDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-06-04", for <time datetime>. */
export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
