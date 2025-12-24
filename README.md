# tamm.in

[![Deploy Astro to GitHub Pages](https://github.com/tamm/tamm.github.io/actions/workflows/main.yml/badge.svg)](https://github.com/tamm/tamm.github.io/actions/workflows/main.yml)

Personal blog and portfolio site built with [Astro](https://astro.build/).

## Development

```bash
npm install
npm run dev      # Start dev server at localhost:4321
npm run build    # Build static site to ./dist
npm run preview  # Preview production build
```

## Adding Blog Posts

Create a new markdown file in `src/content/blog/` with frontmatter:

```markdown
---
title: "Your Post Title"
description: "A brief description"
pubDate: 2025-01-01
tags: ["tag1", "tag2"]
---

Your content here...
```

## Project Structure

```
src/
├── content/blog/     # Markdown blog posts
├── pages/            # Astro pages
├── components/       # Reusable components
├── layouts/          # Page layouts
└── config/           # Site configuration (navigation, etc.)
```

## Related

- [tamm-shortlinks](https://github.com/tamm/tamm-shortlinks) - Cloudflare Worker handling tamm.in/to/* shortlinks
