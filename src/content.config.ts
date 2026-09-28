import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const fieldNotes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/field-notes" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tag: z.string().optional(),
    description: z.string(),
    // A sentence quoted verbatim from the note; the newest note that has
    // one is featured on the home page.
    pullquote: z.string().optional(),
  }),
});

export const collections = { fieldNotes };
