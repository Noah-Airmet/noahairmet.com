export const site = {
  name: "Noah Airmet",
  url: "https://noahairmet.com",
  description:
    "Noah Airmet studies cybersecurity at BYU and builds software at Simplicity Group, working toward a career securing and governing AI systems.",
  email: "noah.airmet@icloud.com",
  github: "https://github.com/Noah-Airmet",
  linkedin: "https://www.linkedin.com/in/noah-airmet",
  resume: "/resume/noah-airmet-resume.pdf",
  pulpit: "https://pulpit-archive.org/",
  agentBus: "https://github.com/Noah-Airmet/agent-bus",
};

export const tabs = [
  { id: "about", label: "About", href: "/" },
  { id: "pulpit", label: "Pulpit", href: "/pulpit/" },
  { id: "writing", label: "Writing", href: "/writing/" },
] as const;

export type TabId = (typeof tabs)[number]["id"];

export const absoluteUrl = (path = "/") => new URL(path, site.url).toString();

export const pageTitle = (title?: string) => (title ? `${title} — ${site.name}` : site.name);

export const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
