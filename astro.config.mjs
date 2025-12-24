import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import critters from 'astro-critters';

export default defineConfig({
  site: 'https://tamm.in',
  integrations: [
    tailwind(),
    sitemap(),
    critters(), // Inline critical above-the-fold CSS
  ],
  output: 'static',
});
