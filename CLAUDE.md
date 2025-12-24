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
---

Your markdown content here...
```

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

## Related Projects

- `../tamm-shortlinks` - Cloudflare Worker for tamm.in/to/* shortlinks
