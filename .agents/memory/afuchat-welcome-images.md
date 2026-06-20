---
name: AfuChat welcome image optimization
description: Onboarding images compressed with ImageMagick and inlined as base64 in a TS module; file imports removed from Welcome.tsx
---

The 5 welcome carousel images were compressed (resize 800px, quality 65%) and converted to base64 data URIs stored in `artifacts/afuchat/src/assets/onboarding/images.ts`. Welcome.tsx imports from that module, not from raw .jpg files.

**Why:** Eliminates the image waterfall on the welcome screen — images appear instantly with the first JS bundle paint instead of making 5 additional HTTP requests after the page loads.

**How to apply:** If new onboarding images are added, compress them first with `magick <img> -resize "800x>" -quality 65 -strip <out>`, then base64-encode and add exports to `images.ts`. Do NOT import .jpg files directly from Welcome.tsx.
