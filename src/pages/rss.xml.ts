import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { site } from "../lib/site";

export async function GET(context: APIContext) {
  const notes = (await getCollection("fieldNotes")).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: `${site.name} — Field notes`,
    description: site.description,
    site: context.site ?? site.url,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.date,
      link: `/field-notes/${note.id}/`,
    })),
    customData: "<language>en-us</language>",
  });
}
