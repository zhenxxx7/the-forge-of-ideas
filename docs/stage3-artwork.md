# Stage 3 artwork

## Provenance and final asset

The built-in imagegen tool prepared a clean background from the user's supplied PDF, page 16. This is derived game artwork, not a newly supplied official asset. The source PDF, extracted reference, and user-provided SVGs were not overwritten.

- Final runtime file: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/public/assets/stage3-sorting-room.webp`.
- Generation source: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-cba8482a-9b02-4e8d-9108-0dd4217c7f98.png`.
- Optimization: `scripts/prepare-stage3-assets.mjs`, local WebP at quality 87, without upscaling or changing the composition.

## Exact prompt

Use case: precise-object-edit. Asset type: clean 2048x1152 16:9 illustrated website game background. Image 1 is the edit target. Remove ONLY all interface and character elements: entire parchment scroll across the bottom, all text and category labels, top timer, right-side circular buttons, left gold-bordered panel, its nine ores and tile outlines, and raven. Reconstruct the scenery behind these removed elements. Preserve the original perspective, framing, crisp painted 2D illustration style and every environmental detail: gothic stone workshop with warm amber lamps, dark bronze columns and pipes, purple windows, tiled metal floor on the left, and three large gold-edged conveyor belts on the right, green, orange, blue from left to right. Keep belts at exactly the same positions, angles and widths as the original, their rear entrances at 17% height and front rollers around 82% height. Green belt centered near 50% width, orange near 66%, blue near 82%. Restore belt sections and floor hidden by parchment naturally. Keep left half as clear dark floor, not new furniture. No gems, characters, lettering, timer, panels, labels, UI, border, watermark or new objects. Full-bleed 16:9.

## Animation and interaction

All lettering, ores, buttons, counts and category choices are native HTML/SVG, never baked into the background. Three clipped CSS layers translate conveyor highlights continuously. Pointer movement uses requestAnimationFrame and transform-only updates; dropped ores use a short Web Animations transform/opacity tween. The SVG raven uses the existing continuous rig.

Ambient belt motion pauses in dialogs, manual pause and hidden tabs. Both the game setting and operating-system reduced-motion preference disable decorative motion. Mouse, touch, and select-then-category keyboard controls update the same validated sorting state. No new animation dependency or external service runs in the game.
