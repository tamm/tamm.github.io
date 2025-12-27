#!/usr/bin/env node
/**
 * Hash static assets in public/ for cache busting.
 *
 * Run after build: node scripts/hash-assets.js
 *
 * This script:
 * 1. Scans dist/ for images (webp, png, jpg, svg)
 * 2. Generates content hash for each
 * 3. Renames files with hash (e.g., qrc-logo.a1b2c3d4.webp)
 * 4. Updates all HTML files with new references
 *
 * Excludes /og/*.png since those are used in OG meta tags
 * which need stable URLs for social platform caching.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join, basename, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');

// Files to hash (relative to dist/)
const HASH_PATTERNS = [
  /^qrc-logo\.webp$/,
  /^tamm-portrait\.webp$/,
  /^og\/.*-\d+w\.webp$/,  // Responsive OG variants (400w, 800w)
  /^og\/.*\.webp$/,       // Full size WebP OG images
];

// Files to skip (need stable URLs)
const SKIP_PATTERNS = [
  /^og\/.*\.png$/,  // OG meta images need stable URLs
];

function shouldHash(relativePath) {
  // Check skip patterns first
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(relativePath)) return false;
  }
  // Then check hash patterns
  for (const pattern of HASH_PATTERNS) {
    if (pattern.test(relativePath)) return true;
  }
  return false;
}

function getFileHash(filePath) {
  const content = readFileSync(filePath);
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}

function findFiles(dir, base = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, relativePath));
    } else {
      files.push({ relativePath, fullPath });
    }
  }
  return files;
}

function findHtmlFiles(dir) {
  const htmlFiles = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      htmlFiles.push(...findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
  return htmlFiles;
}

function main() {
  console.log('Hashing static assets...\n');

  const files = findFiles(DIST_DIR);
  const renames = []; // { from: relativePath, to: hashedPath }

  // Find and rename files
  for (const { relativePath, fullPath } of files) {
    if (!shouldHash(relativePath)) continue;

    const hash = getFileHash(fullPath);
    const ext = extname(relativePath);
    const base = basename(relativePath, ext);
    const dir = dirname(relativePath);
    const hashedName = `${base}.${hash}${ext}`;
    const hashedPath = dir === '.' ? hashedName : `${dir}/${hashedName}`;
    const hashedFullPath = join(DIST_DIR, hashedPath);

    renameSync(fullPath, hashedFullPath);
    renames.push({ from: relativePath, to: hashedPath });
    console.log(`  ${relativePath} → ${hashedPath}`);
  }

  if (renames.length === 0) {
    console.log('No files to hash.');
    return;
  }

  // Update HTML files
  console.log('\nUpdating HTML references...');
  const htmlFiles = findHtmlFiles(DIST_DIR);

  for (const htmlPath of htmlFiles) {
    let content = readFileSync(htmlPath, 'utf-8');
    let modified = false;

    for (const { from, to } of renames) {
      // Match both /path and path references
      const patterns = [
        new RegExp(`/${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
        new RegExp(`"${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            if (match.startsWith('/')) return `/${to}`;
            if (match.startsWith('"')) return `"${to}"`;
            return match;
          });
          modified = true;
        }
      }
    }

    if (modified) {
      writeFileSync(htmlPath, content);
      console.log(`  Updated: ${basename(htmlPath)}`);
    }
  }

  console.log(`\nDone! Hashed ${renames.length} files.`);
}

main();
