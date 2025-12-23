# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for Tamm Sjödin at tamm.in. Built as a static site generator using Remix.run - posts are stored in SQLite, the site is built by crawling the running server with wget, then static output is deployed to GitHub Pages.

The domain tamm.in also serves shortlinks at `/to/*` via a separate Cloudflare Worker project at `../tamm-shortlinks`.

## Commands

```bash
# Development
yarn dev              # Start dev server (CSS + Remix + SVG watchers)

# Building
yarn build            # Full build: CSS → Remix → static HTML generation
yarn generate:css     # Tailwind CSS only

# Testing
yarn test             # Vitest unit tests
yarn test:e2e:dev     # Cypress interactive mode
yarn test:e2e:run     # Cypress headless (uses mocks, port 8811)
yarn validate         # Full validation: tests + lint + typecheck + e2e

# Code Quality
yarn lint             # ESLint
yarn typecheck        # TypeScript check
yarn format           # Prettier

# Database
yarn setup            # Prisma generate + migrate + seed
```

## Architecture

**Stack:** Remix + React 18 + TypeScript + Tailwind CSS + Prisma/SQLite

**Content Flow:**
1. Posts stored as markdown in SQLite (`prisma/data.db` locally)
2. Rendered with `marked` + `highlight.js` + `isomorphic-dompurify`
3. Static build uses wget to crawl running server → outputs to `/static`
4. GitHub Actions deploys `/static` to GitHub Pages

**Key Paths:**
- `app/routes/` - File-based routing (posts list, single post, admin CRUD)
- `app/components/` - React components (Navigation, PostEditor, PostRender)
- `app/models/post.server.ts` - Post CRUD operations
- `prisma/schema.prisma` - Data schema (Post model with slug as PK)

**Path Alias:** `~/*` maps to `./app/*`

## Blog Post Workflow

When helping write or publish blog posts:
1. Use the admin interface or directly create posts via Prisma
2. Posts use markdown with code syntax highlighting support
3. Run `yarn build` to regenerate static site
4. Commit and push triggers GitHub Actions deploy

## Google Analytics Integration

The shortlinks project at `../tamm-shortlinks` has GA4 configured:
- Measurement ID: `G-Z9HFYE12L4`
- To add to this site, inject the gtag script in `app/root.tsx`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-Z9HFYE12L4"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-Z9HFYE12L4');
</script>
```

## Environment Variables

```bash
DATABASE_URL="file:./data.db?connection_limit=1"
SESSION_SECRET="super-duper-s3cret"
```

## Deployment

- **GitHub Actions** deploys static output to GitHub Pages on push to main
- **Fly.io** config exists for full-stack hosting (fly.toml, Dockerfile)
- Node version: 18.9.0 (see `.node-version`)

## Related Projects

- `../tamm-shortlinks` - Cloudflare Worker for tamm.in/to/* shortlinks, has Cloudflare access for the tamm.in domain
