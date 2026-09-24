# Mockup redesign artwork

## Runtime assets and provenance

All runtime files are local to this repository. The supplied study background, raven, existing stage backgrounds, and extracted stage icons are preserved.

| Runtime path | Source / method |
| --- | --- |
| `public/assets/mockup-{home,raven,journal,door,hourglass}.webp` | Direct crops of the supplied reference controls; `scripts/prepare-mockup-icons.mjs` records crop coordinates. |
| `public/assets/navigation-{previous,next}.svg` | Transparent vector navigation arrows, replacing the cropped controls that carried background pixels. |
| `public/assets/ore-0.webp` through `ore-8.webp` | Built-in imagegen, reference-derived transparent 3×3 ore atlas; split and optimized by Sharp. |
| `public/assets/infusion-0.webp` through `infusion-2.webp` | Built-in imagegen, reference-derived transparent blue/green/cyan potion set; split and optimized by Sharp. |
| `public/assets/forge-dialogue-parchment.svg` | User-supplied `Group.svg`, renamed as the source for the active dialogue paper. |
| `public/assets/forge-dialogue-parchment.webp` | Optimized render of that SVG, used by the animated dialogue; rebuild with `scripts/prepare-dialogue-parchment.mjs`. |
| `public/assets/storybook-wordmark.webp` | Built-in imagegen, transparent reference-derived distressed title. |
| `src/components/RuneGlyph.tsx` | Native SVG rune glyphs and quill, matching the reference's shapes and colors. |
| `src/components/EndingStage.tsx` | Existing editable SVG record scroll, refined with gold rollers, ribbon, wax seal, and subtle paper grain. |
| `src/components/VictoryBurst.tsx` | Code-native SVG fire/smoke impact extending the existing CSS effect. Only the containing layer animates. |

The added WebP sprites are optimized and retain transparency where needed. Processing only trims, crops, resizes and converts them. No CSS-background screenshot is used as the entire interactive game.

## Built-in generation sources

Mode: **built-in imagegen**. No CLI/API fallback or API key was used.

The original generated exports are not checked in. To rebuild, supply a local
directory containing these files:

- Ores: `exec-5dfc222d-638a-418f-a5ee-384ae35d3d7d.png`
- Potions: `exec-e5029f4a-0050-49c7-ba15-28ae3817366a.png`
- Earlier parchment concept (not used at runtime): `exec-1ecbadb1-271b-42af-9c5b-d2bf2a00550e.png`
- Wordmark: `exec-da70edb1-1c81-4964-9df8-ae9dd861e39a.png`

Rebuild the generated ore, potion and title sprites, then render the active supplied parchment, with:

```sh
node scripts/prepare-storyboard-art.mjs <generated-image-directory>
node scripts/prepare-dialogue-parchment.mjs
```

These source originals were not modified. Source exports are not required at runtime; every referenced WebP is checked into the project when the changes are committed.

## Prompt notes

The three initial asset briefs below document the delivered visual specification; they are reconstructed briefs, not a verbatim request log.

### Ore atlas

Reference: Stage 3 sorting tray, `reference/stage3/page-16-1.png`. Extract/reconstruct the nine illustrated ore specimens as individual full objects on genuine transparent alpha. Preserve their purple, white, dark, iridescent, blue, green, amber-blue, violet and brown appearances, faceted texture and lighting. A regular 3×3 atlas, one complete ore per cell, without labels, UI, frames or scenery.

### Potion set

Reference: Stage 5 infusion review, `reference/stage5/page-25-1.png`. Extract/reconstruct the three distinct ornate bottles on genuine transparent alpha: long blue bottle with purple cap, green faceted bottle, and cyan ornamental bottle with blue crystal cap. Preserve illustrated gold details and full silhouettes. Three evenly spaced full objects; no UI, words, raven or background.

### Dialogue parchment

The initial generated concept used `reference/question.png` to produce a wide blank aged parchment with rolled ends and transparent surroundings. The user-supplied SVG superseded it and is the runtime source.

### Wordmark — retained exact prompt

> Use case: background-extraction. Image 1 is the edit target. Extract only the title lettering "The Forge of Ideas" as a genuinely transparent PNG alpha cutout. Match exact distinctive rough distressed white angular blackletter typography, individually tilted letters and big whimsical irregular letter shapes. Preserve small handwritten italic "The" above the left third. Keep wording exactly. Reconstruct the tiny part of F hidden by raven beak. Remove all background, raven, crest, buttons and objects. Text only, no panel, no extra objects, no new wording. Wide title fills canvas with small margins.

## Remaining fidelity boundary

Optional raster extractions of the sealed scroll and explosion hit the built-in generation usage limit and produced no usable asset. They are not referenced by the app. The existing vector scroll and code-native effect were refined instead. A CLI generation fallback would require explicit approval and a configured `OPENAI_API_KEY`; it was not invoked.

The generated sprites and reconstructed background artwork are reference-based approximations. Exact scene copy, ordering and functional controls are authored HTML/React, not baked into those images. Institutional imagery still needs the owner's publication approval.
