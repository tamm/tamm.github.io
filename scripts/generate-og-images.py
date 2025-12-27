#!/usr/bin/env python3
"""
Generate Open Graph images for blog posts using Gemini image generation.

Usage:
    python3 scripts/generate-og-images.py [slug]

If slug is provided, generates only for that post. Otherwise generates for all posts
that don't already have an OG image.
"""

import os
import sys
import re
import base64
import subprocess
import requests
from pathlib import Path
from io import BytesIO
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

MODEL = "gemini-3-pro-image-preview"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
BLOG_DIR = PROJECT_ROOT / "src/content/blog"
OG_DIR = PROJECT_ROOT / "public/og"
LOGO_SVG = PROJECT_ROOT / "public/safari-pinned-tab.svg"
LOGO_HEIGHT_PERCENT = 24  # Logo height as % of image height
LOGO_MARGIN_PERCENT = 4  # Margin from edges as % of image dimensions


def overlay_logo(image_path: Path) -> None:
    """Overlay the logo SVG onto the bottom-right corner of the image."""
    try:
        # Open the generated image first to get dimensions
        img = Image.open(image_path).convert('RGBA')

        # Calculate logo size based on image height
        logo_size = int(img.height * LOGO_HEIGHT_PERCENT / 100)

        # Convert SVG to PNG using rsvg-convert (brew install librsvg)
        result = subprocess.run(
            ['rsvg-convert', '-w', str(logo_size), '-h', str(logo_size), str(LOGO_SVG)],
            capture_output=True
        )
        if result.returncode != 0:
            print(f"  Warning: Could not convert logo SVG (install librsvg?)")
            return

        logo = Image.open(BytesIO(result.stdout)).convert('RGBA')

        # Invert to white (logo is black on transparent)
        pixels = logo.load()
        for y in range(logo.height):
            for x in range(logo.width):
                r, g, b, a = pixels[x, y]
                if a > 0:
                    pixels[x, y] = (255, 255, 255, a)

        # Position: bottom-right with percentage-based margins
        margin_x = int(img.width * LOGO_MARGIN_PERCENT / 100)
        margin_y = int(img.height * LOGO_MARGIN_PERCENT / 100)
        position = (img.width - logo.width - margin_x, img.height - logo.height - margin_y)

        # Composite
        img.paste(logo, position, logo)
        img.convert('RGB').save(image_path)

    except FileNotFoundError:
        print(f"  Warning: rsvg-convert not found, skipping logo overlay")
    except Exception as e:
        print(f"  Warning: Could not overlay logo: {e}")


def parse_frontmatter(content: str) -> dict:
    """Extract frontmatter from markdown file."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return {}

    frontmatter = {}
    for line in match.group(1).split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            frontmatter[key] = value
    return frontmatter


STYLE_REF = SCRIPT_DIR / "assets/og-style-reference.png"


def generate_og_image(title: str, description: str, output_path: Path, custom_prompt: str = "") -> bool:
    """Generate an OG image using Gemini."""

    imagery_instructions = custom_prompt if custom_prompt else "Simple sketchy illustrations relevant to the title"

    prompt = f"""Create an Open Graph image matching the EXACT style of the reference image I'm providing.

Title for this new image: "{title}"

MATCH THE REFERENCE IMAGE EXACTLY FOR:
- The chunky, bold, playful hand-lettered font style - thick brushy strokes, casual and warm, like the reference image's title text
- The dark charcoal background
- The white and orange (#f48031) color scheme
- The loose, sketchy line quality
- The overall napkin-sketch aesthetic

FONT IS CRITICAL: Use the same chunky, thick, hand-brushed lettering style as the reference image. NOT thin, NOT elegant, NOT serif - chunky casual brush strokes.

SPECIFIC IMAGERY FOR THIS POST:
{imagery_instructions}

CRITICAL RULES:
- ONLY include the title text, absolutely NO other words or labels
- Add loose scribbles and sketch lines that bleed RIGHT OFF the edges of the image - very whimsical, like someone was doodling and ran out of paper
- Leave bottom-right corner empty (logo added later)
- Do NOT draw people or faces
- Keep it loose, playful, and whimsical like a quick napkin doodle"""

    # Load style reference image
    style_ref_b64 = None
    if STYLE_REF.exists():
        with open(STYLE_REF, 'rb') as f:
            style_ref_b64 = base64.b64encode(f.read()).decode('utf-8')

    parts = [{"text": prompt}]
    if style_ref_b64:
        parts.insert(0, {
            "inline_data": {
                "mime_type": "image/png",
                "data": style_ref_b64
            }
        })

    request_body = {
        "contents": [{
            "parts": parts
        }],
        "generationConfig": {
            "responseModalities": ["image", "text"],
        }
    }

    headers = {"Content-Type": "application/json"}
    params = {"key": GEMINI_API_KEY}

    print(f"  Generating image...")

    try:
        response = requests.post(
            API_URL,
            json=request_body,
            headers=headers,
            params=params,
            timeout=60
        )

        if response.status_code != 200:
            print(f"  Error: API returned {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return False

        result = response.json()

        # Extract image from response
        candidates = result.get('candidates', [])
        if not candidates:
            print("  Error: No candidates in response")
            return False

        parts = candidates[0].get('content', {}).get('parts', [])

        for part in parts:
            if 'inlineData' in part:
                image_data = base64.b64decode(part['inlineData']['data'])

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'wb') as f:
                    f.write(image_data)

                size_kb = len(image_data) / 1024
                print(f"  Saved: {output_path.name} ({size_kb:.1f} KB)")

                # Overlay the logo
                overlay_logo(output_path)

                # Also generate WebP versions for faster page loads
                try:
                    img = Image.open(output_path)

                    # Full size WebP
                    webp_path = output_path.with_suffix('.webp')
                    img.save(webp_path, 'WEBP', quality=85)
                    webp_kb = webp_path.stat().st_size / 1024
                    print(f"  Saved: {webp_path.name} ({webp_kb:.1f} KB)")

                    # 800w responsive version
                    img_800 = img.resize((800, 420), Image.Resampling.LANCZOS)
                    webp_800_path = output_path.with_stem(output_path.stem + '-800w').with_suffix('.webp')
                    img_800.save(webp_800_path, 'WEBP', quality=85)
                    print(f"  Saved: {webp_800_path.name} ({webp_800_path.stat().st_size / 1024:.1f} KB)")

                    # 400w responsive version
                    img_400 = img.resize((400, 210), Image.Resampling.LANCZOS)
                    webp_400_path = output_path.with_stem(output_path.stem + '-400w').with_suffix('.webp')
                    img_400.save(webp_400_path, 'WEBP', quality=85)
                    print(f"  Saved: {webp_400_path.name} ({webp_400_path.stat().st_size / 1024:.1f} KB)")
                except Exception as e:
                    print(f"  Warning: Could not create WebP versions: {e}")

                return True

        print("  Error: No image in response")
        return False

    except requests.exceptions.Timeout:
        print("  Error: Request timed out")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        return False


def get_blog_posts() -> list:
    """Get all blog posts from the content directory."""
    posts = []
    for md_file in BLOG_DIR.glob("*.md"):
        content = md_file.read_text()
        frontmatter = parse_frontmatter(content)

        if frontmatter.get('draft', 'false').lower() == 'true':
            continue

        slug = md_file.stem
        posts.append({
            'slug': slug,
            'title': frontmatter.get('title', slug),
            'description': frontmatter.get('description', ''),
            'og_prompt': frontmatter.get('ogPrompt', ''),
            'og_path': OG_DIR / f"{slug}.png"
        })

    return posts


def main():
    """Main execution."""
    print("=" * 60)
    print("OG Image Generator (Gemini)")
    print("=" * 60)

    # Check for specific slug argument
    target_slug = sys.argv[1] if len(sys.argv) > 1 else None

    posts = get_blog_posts()

    if target_slug:
        posts = [p for p in posts if p['slug'] == target_slug]
        if not posts:
            print(f"No post found with slug: {target_slug}")
            return 1

    generated = 0
    skipped = 0
    failed = 0

    for post in posts:
        print(f"\n{post['title']}")

        if post['og_path'].exists() and not target_slug:
            print("  Skipped (already exists)")
            skipped += 1
            continue

        if generate_og_image(post['title'], post['description'], post['og_path'], post['og_prompt']):
            generated += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"Done! Generated: {generated}, Skipped: {skipped}, Failed: {failed}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())
