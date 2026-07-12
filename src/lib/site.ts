export const site = {
  name: "Noah Airmet",
  url: "https://noahairmet.com",
  description:
    "Noah Airmet is a software developer and cybersecurity student pursuing practical AI governance from inside real technical workflows.",
  email: "noah.airmet@icloud.com",
  github: "https://github.com/Noah-Airmet",
  linkedin: "https://www.linkedin.com/in/noah-airmet",
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
  return title ? `${title} | ${site.name}` : site.name;
}
