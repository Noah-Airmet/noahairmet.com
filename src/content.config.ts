import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const work = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/work" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["draft", "review", "published"]).default("draft"),
    role: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    externalUrl: z.url().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/writing" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["draft", "review", "published"]).default("draft"),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { work, writing };
