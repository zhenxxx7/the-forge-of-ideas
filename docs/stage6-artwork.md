# Stage 6 artwork

## Provenance and final assets

The built-in imagegen tool edited the Beast Encounter scene from the user's supplied English Literature PDF, page 27. The PDF skill guided inspection of Stage 6 pages 27–30. One edit prepared a clean battlefield; a second extracted the Beast as a transparent sprite. These are derived game visuals, not additional official MOE assets. The supplied PDF and extracted reference remain unchanged.

- Runtime battlefield: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/public/assets/stage6-battlefield.webp`.
- Runtime transparent Beast: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/public/assets/stage6-beast.webp`.
- Generated battlefield source: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-1e071898-494a-415f-8ba6-21fd602e0694.png`.
- Generated Beast source: `C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-fcca9894-9e8e-4cbe-9924-aafe4574d95d.png`.
- Edit reference: `C:/Data/prgm/FXmedia-Project/the-forge-of-ideas/reference/stage6/page-27-1.png`.
- Optimization: `scripts/prepare-stage6-assets.mjs`, WebP quality 87 for battlefield and 90 with alpha quality 95 for the Beast, with no upscaling.

## Exact battlefield prompt

Use case: precise-object-edit. Asset type: clean 2048x1152 16:9 illustrated browser-game battlefield background. Image 1 is the edit target, the Stage 6 Beast Encounter screenshot from the supplied reference PDF. Remove only all foreground/game elements: the shadow beast at the center, raven at lower left, bottom parchment scroll and all text, two bottom navigation arrows, and the three round utility buttons at upper right. Reconstruct the empty fog, terrain, shadows, and lighting behind every removed element. Preserve the exact original wide frontal composition and crisp painted 2D dark fantasy style: a black-gray barren cracked plain stretching to the horizon, soft patches of reflective ash on the ground, cavernous smoky fog, and the cold dramatic pale moonlit opening at top center. Center should be OPEN and empty to receive a separately rendered code-animated beast. Keep original low-contrast gray/black palette and subtle mauve undertones. No characters, creatures, weapons, UI, lettering, symbols, border, watermark, or new objects. Full bleed landscape 16:9.

## Exact Beast prompt

Use case: background-extraction. Asset type: transparent 2D game character sprite for a browser encounter. Image 1 is the source/reference Stage 6 screenshot from the supplied PDF. Extract ONLY the full-body Inarticulate Beast at the center of that image, preserving its distinctive original silhouette, pose and hand-painted design: a tall hunched shadow creature made from jagged black-violet tendrils and spikes, long downward beak-like head, narrow torso, very long clawed arms and rooted feet. Remove ALL surrounding battlefield, sky, fog, ground, UI, raven, scroll, text, health display and particles. Fill any gaps around its limbs with true transparency. Clean crisp creature edges while retaining its shadowy painted texture, not a solid cartoon outline. Beast should stand centered and fully visible, head to feet, with moderate transparent padding. Transparent PNG with real alpha; no new creature features, no text, no shadow painted onto a background, no watermark.

## Native animation and interpretation

The Beast is a transparent WebP sprite over the clean battlefield. Its slow transform animation, status bars, dotted trajectory, target reticle, projectile flight and impact are native HTML/SVG/CSS. No new runtime dependency or backend is used. Flight and ambient movement pause in menus and hidden tabs; reduced motion shortens them. Mouse/touch battlefield selection and a keyboard-operable range input aim horizontally.

Pages 27–30 specify choosing an infusion, aiming, launching, tracking the Beast and Confusion, and showing impact. The storyboard does not provide a numeric combat formula or literary scoring rubric. This implementation uses a transparent aim window for game accuracy, requires one hit if the learner has one ready infusion or two hits if they have more, and allows retry without losing Stage 5 writing. The Archival Hall and ending are not implemented here.
