import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    memberOnly: z.boolean().default(false), // Requires Ko-fi membership to view full content
    tags: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
    ogPrompt: z.string().optional(), // Custom prompt for OG image generation (not rendered)
  }),
});

export const collections = { blog };
