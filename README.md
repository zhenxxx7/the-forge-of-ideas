# The Forge of Ideas

A browser implementation of the supplied English Literature mockup, scoped to **onboarding and Stages 1–4**.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The dev server binds to localhost.

```sh
npm run build
npm run preview
npm test
npx playwright install chromium
npm run test:e2e
```

`dist/` is a static deployment, with no backend or external API needed. Fonts and artwork are served locally.

## Implemented flow

1. CPDD opening card and illustrated landing screen.
2. Name entry with validation and nickname support.
3. Three-part raven prologue with previous/next controls.
4. Stage 1: explore **How**, **this moment**, and **so tense** in the supplied Bradbury question.
5. Journey overview, Stage 1 completion, and downloadable quest notes.
6. Stage 2's forest gateway, introduction, eight explorable idea ores, collection pouch, and completion review.
7. Return to the journey map, revisit Generate, and resume saved idea gathering.
8. Stage 3: sorting-room introduction, three category conveyor belts, editable sorting decisions, and completion review.
9. Revisit Sort from the journey map; category choices are included in the journal and downloaded notes.
10. Stage 4: connecting chamber, central/supporting ore pairing, animated crystals, editable connecting statements, and completion review.
11. Revisit Connect to strengthen a crystal with a second supporting idea, refine writing, or reconsider earlier sorting.

Stages 5–6 and the Archival Hall appear in the map as locked previews; they are not implemented. No full literary extract or automated literary grading is included. The question and learning sequence come from the mockup; expanded keyword guidance is authored for this interactive build.

## Stage 2 behavior and content

- Complete Stage 1 to unlock Generate. Existing version-1 saves migrate automatically without losing names, keyword discoveries, or completion.
- Select any of eight glowing ores, read the idea, and collect or remove it. At least one collected idea is required for completion; no idea is marked right or wrong. Completing early is allowed.
- The timer starts at **60:00 (60 minutes)**, following the mockup's display. Its scope is active idea exploration. It pauses during menus, the pouch dialog, other screens, hidden tabs, and manual pause. An untimed mode is available. The mockup's inconsistent later timer values are not hard-coded into the game.
- On expiry, the pouch review opens without losing ideas. An empty pouch does not count as completion. Learners can continue untimed, or explicitly turn the timer back on to start a fresh timed period.
- Pouch contents and the remaining time save locally. Reviewing the completed stage does not clear the pouch; changes can be reviewed and completed again. Downloaded notes include the chosen ideas and their source labels.
- **Content needs teacher review before publication:** “AI is becoming more lifelike” is the one idea prompt visible in the reference. The seven other prompts in `src/stage2.ts` are clearly labeled starter ideas, not quotations, an authoritative interpretation, or a graded answer key. Replace them with approved classroom prompts when available.

## Behavior

### Stage 3: Sort

- Completing Stage 2 unlocks Sort. Only ideas currently in the player's pouch are used; the mockup's nine sample ores are not injected into an eight-prompt collection.
- Select an ore to read its text on the parchment, then choose the green **Central**, amber **Supporting**, or blue **Irrelevant** belt. Pointer dragging works with mouse or touch; select-then-category buttons work with keyboard or taps. Text labels accompany every color.
- Any idea can move between belts or return to the tray. Undo reverses the last move in the current activity session. An invalid or cancelled drag changes nothing.
- Every collected idea needs a category before completion. There is no answer key, score, forced central idea, or deletion of irrelevant ideas. Learners decide relevance against their classroom extract.
- A separate **40:00 (40-minute)** Stage 3 timer follows PDF pages 15–16. Only active sorting consumes time. It pauses during menus, review, hidden tabs, and manual pause. Untimed sorting is available. Expiry preserves all work and opens review; incomplete work can continue untimed.
- Older saves migrate additively under the existing version-1 key. Revisiting Generate preserves classifications for retained ideas, removes classifications for discarded ideas, and requires a new sorting review after pouch changes. Generate must be completed again before re-entering Sort.
- Conveyor highlights use transform-only CSS loops. Pointer dragging is requestAnimationFrame-based, and ore placement uses a 460 ms transform/opacity tween. Decorative movement respects reduced motion and hidden-tab/menu pauses. Phaser does not load for the Stage 3 scene.

### Stage 4: Connect

- Completing Stage 3 unlocks Connect. Only currently collected ideas sorted as **Central** or **Supporting** enter the two inventories. No compatible pair? Revisit Sort and make your own category choices; the game does not reclassify ideas automatically.
- Select or drag one ore into each matching receptacle, then **Forge connection**. Write a connecting statement in your own words (maximum 600 characters). Keyboard and tap controls do not require dragging.
- Each central idea has one crystal with up to **two distinct supporting ideas**. A supporting idea may develop more than one central idea. Strengthening a crystal keeps its existing statement; remove a support or revise the text as needed.
- Completion requires at least one crystal and a nonblank statement for every saved crystal, with all pairs still matching current categories. These are structural readiness checks, not literary grading or an answer key. Not every central idea must be used.
- Changing an earlier pouch or category invalidates completion but preserves all authored connections and writing. Stale crystals are flagged for review, including ores no longer in the pouch. Disconnect an ineligible support, reconsider Sort, or explicitly confirm removal of a crystal. Only that confirmed removal discards its statement; original ores remain.
- A separate **60:00 (60-minute)** timer runs only during combining/explaining. Menus, crystal collection, hidden tabs, review and manual pause stop it. Expiry preserves writing and opens review. Continue untimed or explicitly restart a timed period.
- Statements autosave with the existing version-1 progress record and appear in the quest journal and notes download. Older saves acquire Stage 4 defaults without losing prior progress. Blocked browser storage still allows in-memory play, with a visible saving warning.
- The native SVG crystal uses transform/opacity animation and requestAnimationFrame pointer dragging. Slow energy highlights and crystal motion pause with dialogs, hidden tabs and manual pause; reduced motion disables them. No new dependency or backend is used.

### Shared behavior

- Progress and settings are saved locally in the current browser using a versioned, validated record. If browser storage is blocked, play continues and the UI reports that it cannot save.
- Returning Home does not discard progress. Beginning anew asks before replacing the previous adventure.
- All learning controls use semantic HTML. Keyboard navigation, native dialog focus trapping, reduced motion, and larger dialogue are available.
- Audio is optional and off by default. Interaction sounds are synthesized locally after user interaction; no downloaded music or narration is implied.
- Desktop uses the reference's 16:9 composition. Portrait screens use larger, reflowed controls. Actual phone hardware and Safari still require device QA before release.
- Phaser is lazy-loaded for bounded ambient particles and candle glow; readable UI and background render independently of it. Effects are removed in reduced-motion mode.
- The raven is a single SVG rig derived from the closed-beak original. Its body and feet stay fixed while its jaw pivots and head gently nods. Time-based interpolation supplies continuous intermediate poses, including when dialogue changes rapidly. Animation pauses in hidden tabs and respects both the game's and the system's reduced-motion setting.

## Artwork

- `public/assets/study.webp`: optimized copy of the supplied `landing-screen__bg.png`, keeping its composition.
- `public/assets/raven.svg` and `raven-beak-open.svg`: the supplied original SVGs, copied unchanged. Only `raven.svg` is used in the animated rig; the second drawing remains as a reference, not a swapped frame.
- Stage icons, MOE crest, and paper texture: extracted from the supplied PDF.
- CPDD opening logo: extracted from the supplied storyboard. This is a small reference image; a vector original would improve the opening card.
- Gold framing and controls: SVG/CSS; lesson text is selectable HTML.
- Stage 2 portal backgrounds and transparent ruby pouch: built-in imagegen edits based on the supplied PDF scenes, optimized as local WebP assets. Exact prompts and paths are recorded in `docs/stage2-artwork.md`.
- Stage 3 sorting room: built-in imagegen edit of the supplied PDF page 16, with UI removed. Code-native gems, controls, and moving belt highlights remain interactive. See `docs/stage3-artwork.md` for the exact prompt and file paths.
- Stage 4 connecting chamber: built-in imagegen edit of PDF page 19, with baked-in UI, ores and raven removed. See `docs/stage4-artwork.md` for the exact prompt, provenance, runtime asset and native-animation details.

The original supplied files are never overwritten. A generated study alternative was explored before the original background arrived; it is not used in the shipped game. Supplied institutional imagery remains subject to the owner's publication approval.

`scripts/extract-reference.py` extracts scenes from the supplied PDF using pypdf/Pillow. `scripts/prepare-assets.mjs` builds the runtime assets using the supplied background path and optional storyboard path. Runtime assets are included, so neither script is needed to run the game.

## Project structure

- `src/App.tsx`: onboarding, learning screens, accessible dialogs, navigation.
- `src/data.ts`: script, keyword explanations, future-stage labels.
- `src/state.ts`: progress validation and browser storage.
- `src/stage2.ts`: editable Stage 2 prompts, progress validation, timer rules, and save migration support.
- `src/components/GenerateStage.tsx`: gateway flow, idea collection, pouch review, and paused/untimed exploration.
- `src/stage3.ts`: category rules, validated assignments, pouch reconciliation, and sorting timer.
- `src/components/SortStage.tsx`: sorting belts, pointer/keyboard interaction, review, and animation lifecycle.
- `src/stage3.css`: sorting-room layout and responsive conveyor styling.
- `src/stage4.ts`: validated connections, preserved statements, upstream reconciliation, and timer rules.
- `src/components/ConnectStage.tsx`: chamber, ore pairing, statement editor, review and modal lifecycle.
- `src/components/useConnectionDrag.tsx`: mouse/touch pointer interaction and cancellation.
- `src/stage4.css`: responsive chamber composition and lightweight crystal animation.
- `src/components/`: raven, ornament, and dialog components.
- `src/game/Atmosphere.tsx`: lazy-loaded Phaser atmosphere.
- `src/styles.css`: reference layout and responsive styling.
- `src/stage2.css`: forest-gateway composition, responsive Stage 2 layout, and lightweight transitions.
- `src/state.test.ts`: corrupt-save and validation checks.
- `tests/e2e/`: desktop and mobile browser journey checks.

`node scripts/check-stage2-layout.mjs` checks Stage 2 layout at desktop, portrait, narrow-phone, and landscape-phone sizes, with normal and large dialogue (start the dev server first). `scripts/prepare-stage2-assets.mjs` optimizes generated PNG sources without overwriting them.

`node scripts/check-stage3-layout.mjs` checks 32 Stage 3 combinations: four viewport sizes, normal/large dialogue, introduction, unsorted tray, eight ores on one belt, and review. `scripts/extract-stage3.py` reads PDF pages 15–17; `scripts/prepare-stage3-assets.mjs` optimizes the generated background. Neither is needed to run the included game assets.

No accounts, remote student data, analytics, or cloud saves are included.

`node scripts/check-stage4-layout.mjs` checks 48 Stage 4 combinations: four viewport sizes, normal/large dialogue, introduction, full central/supporting inventories, the 600-character editor, seven-crystal review, and missing categories. Start the dev server first. `scripts/extract-stage4.py` reads PDF pages 18–21; `scripts/prepare-stage4-assets.mjs` prepares the generated background. Runtime artwork is already included.
