import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const fieldNotes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/field-notes" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tag: z.string().optional(),
    description: z.string(),
  }),
});

export const collections = { fieldNotes };
