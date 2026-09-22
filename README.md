# The Forge of Ideas

A browser implementation of the supplied English Literature mockup, including **onboarding, Stages 1–6, and the ending**.

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
12. Stage 5: choose or drag a completed connection crystal into the elaboration chamber, select rune prompts, write a fuller response, and review the resulting infusions.
13. Revisit Elaborate to inspect, edit or remove infusions; writing and readiness appear in the journal and downloaded notes.
14. Stage 6: face the Inarticulate Beast, select a completed infusion, aim by mouse/touch or keyboard, launch, and track the Beast and Confusion.
15. Retry missed encounters without losing writing; complete the challenge to mark Stage 6 on the journey map.
16. Enter the restored valley, pass through its glowing portal, and reach the candlelit Archival Hall.
17. Open the sealed scroll to review the journey record, add an optional reflection, and download all quest notes.

The complete mockup sequence is playable. No full literary extract or automated literary grading is included. The question and learning sequence come from the mockup; expanded keyword, rune and reflection guidance is authored for this interactive build.

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

### Stage 5: Elaborate

- Completing Stage 4 unlocks Elaborate. Only currently valid connected crystals may enter the central chamber. Select by mouse, touch or keyboard, or drag a crystal into place.
- Six rune flasks offer prompts for evidence, language, structure, inference, reader effect and question focus. Select at least two, then write your own response (maximum 1,600 characters). Runes guide thinking but do not generate or grade prose. Check quotations against your classroom extract.
- Each central crystal has one editable infusion. Review its rune choices and writing in a potion-flask collection. Completion requires at least one ready infusion, and every saved infusion must be ready. Removal needs confirmation.
- Earlier connection changes preserve all writing but invalidate Stage 5 completion. Revise the Stage 4 crystal and explicitly refresh its Stage 5 source before counting it again. An ineligible crystal's draft remains available in the journal and downloaded notes.
- A separate **40:00 (40-minute)** timer runs only during choosing/developing. Menus, review, hidden tabs and manual pause stop it. Expiry preserves all work and opens review; untimed continuation is available.
- Work autosaves in the existing version-1 local progress record. Older saves acquire Stage 5 defaults without losing prior stages. The machine background is static WebP; crystal and rune feedback use lightweight CSS/SVG transitions and requestAnimationFrame pointer dragging. Reduced motion disables decorative animation, and no new runtime dependency or backend is used.

### Stage 6: Challenge

- Completing Stage 5 unlocks the Beast encounter. Only currently ready infusions enter its stock. Learners select a vial, tap the battlefield or use a keyboard-operable range control to aim, then launch.
- A hit is determined only by the visible aiming mechanic, never by hidden literary grading. One ready infusion requires one hit; two or more require two hits. Misses raise Confusion. If too few vials remain for success, the encounter ends with a retry option that restores stock without touching Stage 5 writing.
- The Beast/Confusion bars, dotted arc, projectile flight, impact and victory/failed states are live HTML/SVG/CSS over local WebP art. Flight and ambient motion pause in menus and hidden tabs; reduced motion shortens effects. Stage 6 adds no backend or runtime package.
- Encounter progress autosaves in the existing version-1 record. Older saves acquire safe Stage 6 defaults. Changing upstream ideas or writing invalidates the victory and restarts the encounter, while preserving authored responses. The journal and notes download report the game outcome separately from the literary work.

### Ending and Archival Hall

- Stage 6 victory unlocks the ending. **Complete Stage 6** leads directly to the restored valley from PDF page 31. Enter through the clickable portal or its equivalent dialogue button; both work with mouse, touch and keyboard.
- The Hall follows PDF page 32, with the raven above a sealed record scroll. Entering marks the journey complete. Open the scroll to view the learner's name, six completed stages, idea/connection/response counts, and expandable original writing.
- An optional reflection (maximum 1,200 characters) autosaves and appears in the journal and downloaded notes. These are local browser records, not server archives, official certificates, or literary grades. Download a copy before clearing browser data.
- The journey map unlocks the Hall after a validated Stage 6 victory. Returning Home, replaying the valley, revisiting earlier stages and reloading preserve writing. Earlier content changes reset ending completion and relock the Hall, but preserve the reflection for the next visit.
- Older version-1 saves migrate additively. A saved ending route with unfinished prerequisites returns to the first unfinished stage. Blocked storage still permits the entire flow in memory, with a warning and working download.
- Two local WebP backgrounds total approximately 395 KiB. Portal light and sparse dust animate only opacity/transforms, pause in menus and hidden tabs, and stop in reduced-motion mode. No runtime dependency or backend was added.

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
- Stage 5 elaboration room: built-in imagegen edit of PDF page 24, with baked-in UI, crystal, rune graphics and raven removed. See `docs/stage5-artwork.md` for its exact prompt, provenance and runtime asset.
- Stage 6 battlefield and transparent Beast: two built-in imagegen edits of PDF page 27, allowing the encounter to animate over a clean scene. See `docs/stage6-artwork.md` for both exact prompts, provenance and runtime assets.
- Ending valley and Archival Hall: built-in imagegen edits of PDF pages 31–32 with baked-in UI and raven removed. The sealed scroll is native SVG. See `docs/ending-artwork.md` for exact prompts, provenance and runtime paths.

The original supplied files are never overwritten. A generated study alternative was explored before the original background arrived; it is not used in the shipped game. Supplied institutional imagery remains subject to the owner's publication approval.

`scripts/extract-reference.py` extracts scenes from the supplied PDF using pypdf/Pillow. `scripts/prepare-assets.mjs` builds the runtime assets using the supplied background path and optional storyboard path. Runtime assets are included, so neither script is needed to run the game.

## Project structure

- `src/App.tsx`: onboarding, learning screens, accessible dialogs, navigation.
- `src/data.ts`: script, keyword explanations, journey-stage labels.
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
- `src/stage5.ts`: infusion rules, validated save migration, upstream reconciliation and timer.
- `src/components/ElaborateStage.tsx`: crystal selection, rune flasks, writing editor and infusion review.
- `src/components/useCrystalDrag.tsx`: mouse/touch chamber drag with keyboard selection fallback.
- `src/stage5.css`: responsive machine layout and lightweight crystal/rune feedback.
- `src/stage6.ts`: infusion stock, aim/hit rules, retryable encounter, save validation and upstream reconciliation.
- `src/components/ChallengeStage.tsx`: Beast, status bars, infusion selection, accessible aiming and launch flow.
- `src/stage6.css`: responsive battlefield composition and reduced-motion projectile/impact effects.
- `src/ending.ts`: ending validation, additive migration, archive access and preserved reflections.
- `src/components/EndingStage.tsx`: restored valley, interactive portal, Hall, record scroll and reflection editor.
- `src/ending.css`: responsive ending scenes, record layout and lightweight decorative motion.
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

`scripts/extract-stage5.py` reads PDF pages 22–26; `scripts/prepare-stage5-assets.mjs` prepares the generated background. Runtime artwork is already included.

`node scripts/check-stage5-layout.mjs` checks 32 Stage 5 combinations across four viewport sizes, normal/large text, introduction, crystal choice, the 1,600-character editor, and infusion review. Start the dev server first.

`node scripts/check-stage6-layout.mjs` checks 40 Stage 6 combinations across the same four viewport sizes and normal/large text: introduction, instructions, aiming, victory and failure. `scripts/extract-stage6.py` reads PDF pages 27–30; `scripts/prepare-stage6-assets.mjs` prepares both included WebP assets. Start the dev server for the layout check; neither asset script is needed to run the game.

`node scripts/check-ending-layout.mjs` checks 24 combinations: four viewports, normal/large dialogue, valley, Hall and record dialog. It includes a maximum-length learner name and reflection. `scripts/extract-ending.py` reads PDF pages 31–32; `scripts/prepare-ending-assets.mjs` optimizes the two included backgrounds. Start the dev server for layout checks.
