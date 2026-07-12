export const site = {
  name: "Noah Airmet",
  url: "https://noahairmet.com",
  description:
    "Noah Airmet studies practical AI governance through real systems, controls, and institutional workflows.",
  email: "hello@noahairmet.com",
  github: "https://github.com/Noah-Airmet",
  linkedin: "https://www.linkedin.com/in/noahairmet/",
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
