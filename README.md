# The Forge of Ideas

A browser implementation of the supplied English Literature mockup, scoped to **onboarding and Stage 1**.

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

Future stages appear in the map as locked previews; they are not implemented. No full literary extract or automated literary grading is included. The question and learning sequence come from the mockup; expanded keyword guidance is authored for this interactive build.

## Behavior

- Progress and settings are saved locally in the current browser using a versioned, validated record. If browser storage is blocked, play continues and the UI reports that it cannot save.
- Returning Home does not discard progress. Beginning anew asks before replacing the previous adventure.
- All learning controls use semantic HTML. Keyboard navigation, native dialog focus trapping, reduced motion, and larger dialogue are available.
- Audio is optional and off by default. Interaction sounds are synthesized locally after user interaction; no downloaded music or narration is implied.
- Desktop uses the reference's 16:9 composition. Portrait screens use larger, reflowed controls. Actual phone hardware and Safari still require device QA before release.
- Phaser is lazy-loaded for bounded ambient particles and candle glow; readable UI and background render independently of it. Effects are removed in reduced-motion mode.

## Artwork

- `public/assets/study.webp`: optimized copy of the supplied `landing-screen__bg.png`, keeping its composition.
- `public/assets/raven.svg` and `raven-beak-open.svg`: the supplied original SVGs, copied unchanged.
- Stage icons, MOE crest, and paper texture: extracted from the supplied PDF.
- CPDD opening logo: extracted from the supplied storyboard. This is a small reference image; a vector original would improve the opening card.
- Gold framing and controls: SVG/CSS; lesson text is selectable HTML.

The original supplied files are never overwritten. A generated study alternative was explored before the original background arrived; it is not used in the shipped game. Supplied institutional imagery remains subject to the owner's publication approval.

`scripts/extract-reference.py` extracts scenes from the supplied PDF using pypdf/Pillow. `scripts/prepare-assets.mjs` builds the runtime assets using the supplied background path and optional storyboard path. Runtime assets are included, so neither script is needed to run the game.

## Project structure

- `src/App.tsx`: onboarding, learning screens, accessible dialogs, navigation.
- `src/data.ts`: script, keyword explanations, future-stage labels.
- `src/state.ts`: progress validation and browser storage.
- `src/components/`: raven, ornament, and dialog components.
- `src/game/Atmosphere.tsx`: lazy-loaded Phaser atmosphere.
- `src/styles.css`: reference layout and responsive styling.
- `src/state.test.ts`: corrupt-save and validation checks.
- `tests/e2e/`: desktop and mobile browser journey checks.

No accounts, remote student data, analytics, or cloud saves are included.
