# Stage 2 artwork

Prepared with the built-in imagegen tool, using PDF-scene images supplied by the user. The PDF originals and source SVGs were not overwritten. These are derived game assets, not newly supplied official artwork.

## Final runtime files

- `public/assets/stage2-portal.webp` — open, warm gateway; derived from PDF page 11.
- `public/assets/stage2-portal-closed.webp` — matching blue, closed gateway; derived from the open background with PDF page 10 as the door reference.
- `public/assets/stage2-idea-pouch.webp` — transparent ruby-filled leather pouch; derived from PDF page 13.

Optimized using `scripts/prepare-stage2-assets.mjs`. The pouch retains a real alpha channel. A CSS opacity transition reveals the open portal; native HTML supplies all text, controls, timing, and collection state. No lettering or controls are baked into the backgrounds.

## Exact prompts

### Open gateway

Use case: precise-object-edit. Asset type: clean 16:9 website game background, 2048x1152. Input image 1 is the edit target. Remove ONLY all interface elements: the entire bottom parchment scroll, all text, ornate title panel and gold ornaments, top timer, right-side circular buttons, and the raven at lower left. Reconstruct the illustrated scenery behind those removed elements. Preserve the original composition, style, colors and positions of the purple-leaved enchanted forest, stone arch, violet crystal insets, and open dark-purple carved doors. Keep the warm orange African savanna sunset visible through the gateway, with acacia trees. The arch stays centered, spanning approximately x=31% to 69%, its top at the top edge, and its threshold near y=85%. Complete the ground naturally where the parchment was. Match this exact crisp flat-shaded 2D illustration, not a photograph or new redesign. No characters, birds, lettering, UI, borders, watermark, badges or new objects. Full-bleed 16:9 background.

### Pouch cutout

Use case: background-extraction. Asset type: transparent sprite for a 2D website game. Input image 1 is the edit target. Isolate ONLY the large brown leather pouch overflowing with faceted red ruby idea ores, including its drawstrings and the loose ruby gems directly at its base. Preserve its exact illustrated shape, brown leather folds, stitching, rope detail, red gemstones, color, front-facing perspective and crisp flat-shaded painted 2D game style. Remove the entire forest, gateway, raven, parchment, text, timer and UI. Output the full pouch and adjacent loose gems centered as ONE clean cutout on a genuinely transparent alpha background, with a small clear margin around all edges. No background, floor, checkerboard, text, shadow rectangle, border or watermark. Do not crop the top ruby, ropes, or bottom loose gems.

### Closed gateway

Use case: precise-object-edit. Asset type: closed-gateway variant of the game's clean 16:9 background. Image 1 is the edit target: preserve every part of its forest, stones, crystals, framing, lighting and crisp illustrated style. Image 2 is a visual reference ONLY for how the closed half-height purple double doors and blue magical opening should look. In image 1, change ONLY the gateway interior and its door panels: remove the open door leaves from their side positions, replace them with two CLOSED dark-purple carved door panels that span the full inner opening, their horizontal top at approximately 46% of the image height and bottom at the gateway threshold. Their vine carvings, thick wooden framing, brass rings and painted shading must match the doors in image 2. Above the closed half-height doors, the inside of the arch is a smooth luminous cyan-to-indigo magical field as in image 2, with no sunset or savanna visible. The arch and forest outside the inner opening must remain aligned pixel-for-pixel with image 1. No raven or other character. No text, timer, HUD, buttons, parchment, border, watermark or decorative UI. Output exactly the same full-bleed 16:9 framing as image 1.

## Source generation files

- `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-ba8e2c2e-7093-4665-95ce-d23acc1f8e03.png`
- `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-f16f4ece-f876-47a1-8ea4-c5c3caa586e2.png`
- `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-f6164d62-ebf5-4563-af6f-dc72a9f5675b.png`
