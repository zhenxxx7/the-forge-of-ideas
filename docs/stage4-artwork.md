# Stage 4 artwork

## Provenance and final asset

The built-in imagegen tool prepared the clean connecting chamber from the user's supplied PDF, page 19. The PDF skill guided inspection of the full Stage 4 reference sequence on pages 18–21. This is derived game artwork, not an additional official MOE asset. Source documents, extracted reference images and supplied raven SVGs remain unchanged.

- Final runtime asset: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/public/assets/stage4-connecting-room.webp` (323,186 bytes).
- Generated source: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-68e8aecf-e452-422e-abb2-53233854e0f5.png`.
- Edit reference: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/reference/stage4/page-19-1.png`.
- Optimization: `scripts/prepare-stage4-assets.mjs`, WebP quality 87 with no upscaling.

## Exact prompt

Use case: precise-object-edit. Asset type: clean 2048x1152 16:9 illustrated browser-game background. Image 1 is the edit target. Remove ONLY every interface element, all ores and the raven: timer, top left and right black/gold panels with their gem thumbnails, right-side circular buttons, bottom parchment with text and arrows, and both large blue/purple ores in the receptacles. Also remove the jagged lightning arcs between the side nozzles and the central chamber so they can be animated in code; keep the steady soft blue-violet light in the glass tubes. Reconstruct the original scenery behind the removed objects. Preserve exactly the original front-facing composition and crisp painted 2D gothic-steampunk game illustration style: tall blue-gray stone hall, gold and bronze pipes, amber lamps, two round open empty mixing bowls at left and right, enormous faceted transparent empty crystal-shaped glass chamber hanging at center, its gold mechanical ring, and the round pedestal beneath it. Keep all machines at their original positions and scale. Chamber centered at x=50%, spanning approximately x=40% to 60% and y=18% to 56%; bowl centers x=16% and 85%, y=53%. Complete the lower equipment and floor hidden by the parchment. No solid crystal inside the glass chamber, no gems, no characters, no text, no interface, no border, no watermark, no new furniture or props. Full-bleed 16:9.

## Native animation and UI

All text, ores, crystals and controls are live HTML/SVG, not baked into the illustration. Existing `SortGem` colors carry through from Stage 3. The crystal is a new code-native SVG with an extra gold facet when a second support is added. Its appearance uses a 700 ms transform/opacity transition followed by gentle four-second bobbing. Ambient connection lines use slow opacity changes, not flashing. Pointer dragging updates transforms through requestAnimationFrame. The existing continuously interpolated raven rig remains intact.

Ambient chamber motion pauses in menus, review, hidden tabs, and manual timer pause. Both reduced-motion preferences disable decorative animation. Native text input remains responsive without an animation engine, remote service or extra dependency. Phaser is not mounted for the connecting scene.

## Interpretation of the reference

Pages 18–20 establish central/supporting pairing, crystals, typed connecting statements, and the two-support maximum. Page 21 returns to the study for review. Runtime completion returns to the existing study journey map, with Connect available for revision. A separate 60-minute timer follows page 18 rather than reproducing inconsistent elapsed values from later storyboard frames. Connection quality is not automatically graded; readiness checks only current categories and nonblank writing.
