import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Custom integration to optimize CSS delivery
const optimizeCSS = {
  name: 'optimize-css',
  hooks: {
    'astro:build:done': async () => {
      // CSS optimization is handled via head injection in BaseLayout.astro
      // This hook could be extended for more advanced optimizations
    }
  }
};

export default defineConfig({
  site: 'https://tamm.in',
  integrations: [tailwind(), sitemap(), optimizeCSS],
  output: 'static',
});
