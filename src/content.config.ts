import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Shop: one folder per piece in src/content/shop/<piece-name>/, holding index.md and its photos.
// The folder name becomes the page address, e.g. /butik/golden-haven/.
const pieceText = z.object({
  title: z.string(),
  motifs: z.string(),
  tagline: z.string(),
  story: z.string(),
  perfectFor: z.string(),
  garment: z.string().nullish(),
  material: z.string().nullish(),
  care: z.string().nullish(),
});

const shop = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/shop',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) =>
    z.object({
      status: z.enum(['available', 'reserved', 'sold']).default('available'),
      price: z.number().nullish(),
      size: z.string().nullish(),
      order: z.number().default(100),
      images: z.array(image()).nullish().transform((v) => v ?? []),
      sv: pieceText,
      en: pieceText,
    }),
});

// Workshops: one file per workshop in src/content/workshops/.
const workshopText = z.object({
  title: z.string(),
  summary: z.string(),
  duration: z.string(),
  group: z.string(),
  price: z.string(),
});

const workshops = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/workshops' }),
  schema: z.object({
    audience: z.enum(['teams', 'friends']),
    order: z.number(),
    sv: workshopText,
    en: workshopText,
  }),
});

// Blog: one folder per post in src/content/blog/<post-name>/, with sv.md and/or en.md.
// A post written in only one language is shown in that language on both sites.
const blog = defineCollection({
  loader: glob({
    pattern: '*/{sv,en}.md',
    base: './src/content/blog',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
});

export const collections = { shop, workshops, blog };
