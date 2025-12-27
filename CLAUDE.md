# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for Tamm Sjodin at tamm.in. Built with Astro as a static site generator with Tailwind CSS styling. Blog posts are markdown files in `src/content/blog/`.

The domain tamm.in also serves shortlinks at `/to/*` via a separate Cloudflare Worker project at `../tamm-shortlinks`.

## Commands

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build static site to ./dist
npm run preview  # Preview production build
```

## Architecture

**Stack:** Astro 5 + Tailwind CSS + TypeScript

**Content Flow:**
1. Blog posts as markdown in `src/content/blog/*.md` with frontmatter
2. Content collection defined in `src/content/config.ts`
3. Static build outputs to `./dist`
4. GitHub Actions deploys to GitHub Pages

**Key Paths:**
- `src/pages/` - Astro pages (index, about, blog/*)
- `src/content/blog/` - Markdown blog posts
- `src/components/` - Reusable Astro components
- `src/layouts/BaseLayout.astro` - Main page layout
- `src/config/navigation.ts` - Centralized navigation configuration

**Path Alias:** `@/*` maps to `./src/*`

## Blog Post Format

Create new posts in `src/content/blog/` with this frontmatter:

```markdown
---
title: "Post Title"
description: "Optional description"
pubDate: 2025-01-01
tags: ["tag1", "tag2"]
draft: false
ogPrompt: "Custom prompt for OG image generation (optional)"
---

Your markdown content here...
```

## OG Image Generation

Each blog post needs an Open Graph image for social sharing. Images are generated using Gemini and stored in `public/og/{slug}.png`.

**Generate OG images:**
```bash
source .venv/bin/activate
python3 scripts/generate-og-images.py              # All posts missing images
python3 scripts/generate-og-images.py my-post-slug # Specific post (regenerates)
```

**Style:** Hand-drawn napkin sketch aesthetic with chunky brush lettering, dark charcoal background, white/orange (#f48031) color scheme. Reference image at `scripts/assets/og-style-reference.png`.

**Custom prompts:** Add `ogPrompt` to frontmatter for post-specific imagery. Describe the illustration you want (e.g., "seismograph squiggly line", "cute round moon with music rings"). The script combines this with the base style prompt.

**Requirements:**
- Python venv with `requests`, `python-dotenv`, `Pillow`
- `GEMINI_API_KEY` in `.env` file
- `librsvg` for logo overlay (`brew install librsvg`)

**When creating a new blog post, always generate an OG image with an appropriate `ogPrompt`.**

## Navigation Configuration

Edit `src/config/navigation.ts` to modify:
- `mainNavigation` - Header nav links
- `socialLinks` - Social media links with icons
- `footerSections` - Footer link groups

## Google Analytics

GA4 is configured in `src/components/Analytics.astro` with measurement ID `G-Z9HFYE12L4` (same as shortlinks project). Only loads in production, deferred via `requestIdleCallback` to minimize main-thread blocking.

## Performance Targets

**Lighthouse scores to maintain: 100/100/100/100** (as of Dec 2025)

| Metric | Target | Notes |
|--------|--------|-------|
| Performance | 90+ | Critical CSS inlined via astro-critters |
| Accessibility | 100 | Links must have underlines, not just color |
| Best Practices | 100 | CSP headers, no deprecated APIs |
| SEO | 100 | Meta descriptions, semantic HTML |

**Key optimizations in place:**
- `astro-critters` - Inlines critical above-the-fold CSS
- Deferred GA loading - Uses `requestIdleCallback` to avoid blocking
- GPU-accelerated transitions - `will-change` + `translateZ(0)`
- `content-visibility: auto` - Footer renders only when needed
- CSP meta tag - XSS protection, clickjacking prevention

**When adding new features, check:**
- Links have underlines (not just color differentiation)
- Images have explicit width/height attributes
- New scripts are deferred or async
- Run `npm run build` and check for warnings

## Deployment

GitHub Actions automatically builds and deploys to GitHub Pages on push to main. Site health is monitored daily via scheduled workflow.

## Ko-fi Integration

Support/membership platform at [ko-fi.com/tigresstamm](https://ko-fi.com/tigresstamm). Support banner appears on blog posts via `SponsorBanner.astro`. Banner placement configurable in `src/pages/blog/[...slug].astro`.

### Future Plans

- **Membership tracking system**: Ko-fi webhooks only fire on payment events (not cancellations or status checks). Build a system to track membership status locally by storing webhook events and calculating expiry dates. This enables paywalled/members-only content on the blog.

- **Mailchimp sync**: No native Ko-fi → Mailchimp integration. Options:
  - Zapier automation (free tier limited, paid ~$20/mo)
  - Custom webhook handler that adds/removes from Mailchimp via their API
  - Build alongside the membership tracking system above

## Related Projects

- `../tamm-shortlinks` - Cloudflare Worker for tamm.in/to/* shortlinks
