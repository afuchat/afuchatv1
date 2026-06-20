---
name: AfuChat brand color
description: Primary brand color is #1f95ff blue (HSL 208 100% 56%), replacing the original cyan. Logo is base64-encoded in src/assets/logo.ts.
---

Primary brand color: **#1f95ff** → HSL `208 100% 56%`
Hover shade: HSL `208 100% 50%`
Accent: HSL `208 80% 63%`

All CSS variables (`--primary`, `--accent`, `--ring`, `--sidebar-primary`, etc.) were updated in `src/index.css`.
No `cyan-*` Tailwind utility classes remain — all replaced with `primary` semantic class.
Logo is base64-encoded PNG at `src/assets/logo.ts` (export: `afuLogo`), consumed by `components/Logo.tsx`.

**Why:** User requested brand color change from cyan to #1f95ff and new logo asset.

**How to apply:** Any new component using brand color must use `text-primary`, `bg-primary`, etc. (not `cyan-*`). New logo images replace `src/assets/logo.ts` content; do not import raw image files in Logo.tsx.
