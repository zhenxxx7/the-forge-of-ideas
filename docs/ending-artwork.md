# Ending artwork

Source: the user-supplied `Copy of MOE - HTML5 ENGLISH LITERATURE - SECONDARY.pdf`, pages 31–32. These pages show a restored valley with an exit portal, followed by the candlelit Archival Hall and sealed record scroll.

Method: built-in imagegen edit mode, not the API/CLI fallback. Each reference scene was inspected before editing. Source PDF and generated PNG originals remain unchanged.

## Runtime assets

- `public/assets/ending-valley.webp`: 1672 × 941, 299,306 bytes.
- `public/assets/ending-archive.webp`: 1672 × 941, 105,132 bytes.
- `scripts/prepare-ending-assets.mjs` optimizes generated PNGs to WebP at quality 86 without upscaling. Runtime files are included; the preparation script is not needed to play.

Generated originals:

- Valley: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-b33742fa-8571-4668-9d8d-c27d1f2635f0.png`.
- Hall: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-cf5dd127-6793-465b-b312-79b686043987.png`.

## Exact valley prompt

```text
Use case: precise-object-edit
Asset type: 16:9 illustrated web game ending background
Input image: Image 1 is the edit target, the supplied ending mockup.
Primary request: Make a clean background plate from this exact restored forest valley. Remove the large parchment dialogue panel and all text at the bottom, remove the raven at lower left, and remove the three circular interface buttons at upper right. Reconstruct the scenery naturally in those removed regions.
Keep unchanged: centered ancient stone exit portal with pale blue luminous opening and blue crystals at its feet; lush dark foreground trees framing the scene; tiered waterfalls, misty mountains, pools, foliage, and pale daylight. Preserve the original wide composition, portal position, illustrated shape language, and cool green/blue palette.
The portal is an empty luminous passage, no person or character inside. The lower foreground should show continuous natural stone, greenery and water after the parchment is removed. No scroll, no bird, no text, no UI, no new objects, no logos, no watermark.
```

## Exact hall prompt

```text
Use case: precise-object-edit
Asset type: 16:9 illustrated web game Archival Hall background
Input image: Image 1 is the edit target, the supplied final Archival Hall mockup.
Primary request: Make a clean background plate from this exact warm library. Remove the raven, the sealed rolled scroll and red ribbon on the lectern, the large bottom parchment dialogue panel and all its text, and every circular interface button. Reconstruct the underlying surfaces naturally.
Keep unchanged: symmetrical amber candlelit library, tall brown bookshelves, columns, dark blue and gold banners, candles, wooden lectern filling the center foreground, original perspective and wide composition, flat painterly illustrated shape language and warm palette.
The central lectern must be empty, an uninterrupted dark polished brown wooden surface where the game will later overlay an interactive record scroll. No people, no birds, no parchment, no scroll, no words, no UI, no logos, no watermark.
```

## Interactive layers and motion

The supplied raven uses the existing smooth SVG rig. The sealed record scroll is a native SVG button, not baked-in text or a screenshot. The portal glow and eight sparse motes animate only opacity and transforms. Both pause behind menus, in the record dialog, and when the tab is hidden; reduced-motion mode makes them still.

The ending has no timer. Entering the Hall marks the journey complete. Its record displays existing learner writing, six completed stages, counts, and an optional 1,200-character reflection. The mockup's permanent-record wording is adapted to explain the actual local-only save and downloadable notes; no server, official certificate, or literary grade is claimed.
