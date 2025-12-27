import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const site = (context.site ?? 'https://tamm.in').toString().replace(/\/$/, '');

  return rss({
    title: 'Tamm Sjödin',
    description: 'Web Sorceress, Engineering Leader, and Founder of Queer Run Club. Thoughts on tech, creativity, and building inclusive communities.',
    site,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/blog/${post.slug}/`,
        enclosure: {
          url: `${site}/og/${post.slug}.png`,
          type: 'image/png',
          length: 0,
        },
      })),
  });
}
