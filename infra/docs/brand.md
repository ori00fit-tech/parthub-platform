# PartHub brand guidelines

## Logo mark
A "P" whose bowl is a gear; one tooth (upper right) in electric blue: parts
(gear) + platform (P). Drawn in a 64×64 grid, simplified to read at 16 px
(8 teeth, one hole, no inner details).

| File (`infra/brand/`) | Use |
| --- | --- |
| `mark.svg` | Navy + electric blue, on white or light backgrounds |
| `mark-white.svg` | White + light blue, on navy, dark or photo backgrounds |
| `mark-mono.svg` | One color (charcoal): invoices, stamps, fax, embroidery |
| `favicon.svg` | Mark on a white tile: browser tab, app shortcuts |

In code: `import { LogoMark, LogoWordmark } from "@parthub/shared/brand"`
(`variant="color" | "white" | "mono"`). Never redraw the mark by hand; change
`infra/brand/generate.py` and copy its printed paths into
`packages/shared/src/brand/index.jsx`.

Generated images: `apple-touch-icon.png` (180 px, each app),
`logo-512.png` (storefront: schema.org Organization logo), `og-image.png`
(link previews, `infra/brand/og-image.mjs`; keep it under 300 KB or
WhatsApp drops it).

## Wordmark
"PartHub" in IBM Plex Sans Bold, one word, capital P and H; "Hub" in the
accent color. Next to the mark, gap = ¼ of the mark's height; the mark is
about 1.4× the wordmark's cap height. Arabic text next to it: IBM Plex Sans
Arabic. Never "Parthub", "PART HUB" or "Part Hub".

## Colors
| Name | Hex | Use |
| --- | --- | --- |
| Navy | `#102D4B` | Mark, wordmark "Part", dark surfaces |
| Electric blue | `#2875E5` | Accent tooth, "Hub" on light backgrounds |
| Light blue | `#5B9BFF` / `#9CC0FF` | Accent / "Hub" on dark backgrounds |
| Charcoal | `#111827` | Text, one-color logo |
| White | `#FFFFFF` | Backgrounds, mark on dark |

The interface keeps its own tested palette (`apps/*/tailwind.config.js`,
WCAG AA contrast); these colors are for the logo and brand material.

## Don't
- Stretch, rotate, outline or add shadows / 3D to the mark.
- Put the color mark on mid blue or busy photos: use `mark-white.svg`.
- Recolor the accent tooth or use more than one accent tooth.
- Make the mark smaller than 16 px, or the full logo smaller than 96 px wide.
- Leave less clear space around the logo than the height of one gear tooth.
