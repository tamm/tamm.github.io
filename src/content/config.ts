import { defineCollection, z } from 'astro:content';

// Ko-fi membership tiers (higher tiers include access to lower tier content)
// - "Early book club": creative content, early releases, book chapters, songs
// - "AI-pocalypse survivor": AI guides, how-tos, experiments (includes book club access)
const TIER_HIERARCHY = ['Early book club', 'AI-pocalypse survivor'];

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    memberOnly: z.boolean().default(false), // Requires Ko-fi membership to view full content
    requiredTier: z.string().optional(), // Specific tier required (e.g., "Early book club" or "AI-pocalypse survivor")
    tags: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
    ogPrompt: z.string().optional(), // Custom prompt for OG image generation (not rendered)
  }),
});

export const collections = { blog };
export { TIER_HIERARCHY };
