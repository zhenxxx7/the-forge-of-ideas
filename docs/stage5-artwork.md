# Stage 5 artwork

## Provenance and final asset

The built-in imagegen tool edited the Stage 5 development scene from the user's supplied English Literature PDF, page 24. The PDF skill guided inspection of the full Stage 5 sequence on pages 22–26. This is derived game artwork, not an additional official MOE asset. The source PDF and extracted reference remain unchanged.

- Final runtime asset: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/public/assets/stage5-elaboration-room.webp`.
- Generated source: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-545de66f-fc72-4186-a0db-77da76fb7aa1.png`.
- Edit reference: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/reference/stage5/page-24-1.png`.
- Optimization: `scripts/prepare-stage5-assets.mjs`, WebP quality 87 with no upscaling.

## Exact prompt

Use case: precise-object-edit. Asset type: clean 2048x1152 16:9 illustrated browser-game background. Image 1 is the edit target, a Stage 5 screenshot from the supplied reference PDF. Remove only all interface and foreground activity elements: top timer, left three crystal inventory cards and gold panel, right three circular utility buttons, bottom parchment with text and navigation arrows, raven and its perch, the large purple crystal in the central glass chamber, and every red rune plus colored liquid inside the six round foreground flasks. Restore the room, machine, glass and workbench behind them. Preserve the original exact frontal composition and crisp painted 2D gothic-steampunk fantasy style: amber window and bookshelves left, dark shelves right, enormous bronze and teal pipe machine, large empty cyan glass central chamber, six clear EMPTY round glass rune flasks in a row across the foreground on gold holders, their tubes, shadows, frames and warm/cool lighting. Keep all machine and flask positions and scale aligned with input. The round flasks are transparent and empty with natural glass reflections; no letters or symbols inside. Leave chamber empty and transparent for a code-rendered crystal. No text, glyphs, character, gems, inventory, parchment, UI, border, watermark or new props. Full bleed landscape 16:9.

## Native animation and UI

The six selectable runes, central crystal, text editor, dialogs and reviewed infusion vials are code-native HTML/SVG/CSS, not baked into the background. Crystal movement and rune glow use restrained transform/opacity transitions; pointer dragging updates through requestAnimationFrame. Decorative movement pauses in menus, hidden tabs and manual timer pause, and respects reduced motion. Stage 5 does not mount Phaser. Learner writing autosaves locally.

## Interpretation of the reference

Pages 22–26 depict choosing a connection crystal, developing it with six flasks, inspecting infusions and returning to the journey. The storyboard does not define a scoring rubric or exact meaning for each rune; this implementation offers six transparent writing prompts without claiming an automated literary grade or inventing quotations. A separate 40-minute timer follows page 23. Completing Stage 5 requires at least one infusion with two selected runes and nonblank writing, with every saved draft ready. Stage 6 remains a locked preview.
