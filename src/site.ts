export const site = {
  name: "Noah Airmet",
  url: "https://noahairmet.com",
  description:
    "Noah Airmet works in development and AI security at Simplicity Group, is Lead Technical Fellow at the Mormon Transhumanist Association, and studies cybersecurity at BYU.",
  email: "noah.airmet@icloud.com",
  github: "https://github.com/Noah-Airmet",
  linkedin: "https://www.linkedin.com/in/noah-airmet",
  x: "https://x.com/AirmetNoah",
  resume: "/resume/noah-airmet-resume.pdf",
  simplicity: "https://www.simplicitygroup.com/",
  mta: "https://x.com/transfigurism",
  byu: "https://www.byu.edu/",
  safetypage: "https://safetypage.noahairmet.com",
  citationbench: "https://safetypage.noahairmet.com/citationbench",
  safetypageRepo: "https://github.com/Noah-Airmet/safetypage",
  safetypageApi: "https://safetypage-api.noahairmet.com",
  card: { image: "/og/card.png?v=5", video: "/media/card.mp4?v=1", width: 1200, height: 630 },
};

export const absoluteUrl = (path = "/") => new URL(path, site.url).toString();
export const pageTitle = (title?: string) => (title ? `${title} · ${site.name}` : site.name);
export const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
