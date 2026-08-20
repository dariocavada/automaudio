# Project status

Last updated: August 19, 2026.

## Current snapshot

Local version: `0.1.0`, not yet published to npm.

Planned npm name: `@dariocavada/automaudio`.

Status: buildable pre-beta implementation with a headless engine, Web Component, playground, and documentation.

## Implemented features

- Primary/secondary tracks and `url`/`asset` sources.
- RMS voice-track analysis.
- Short-silence merging and music restoration after `silenceDurationMs`.
- Threshold, minimum voice duration, attack, release, minimum volume, and maximum volume.
- Per-secondary-track envelopes.
- Versioned JSON state.
- `OfflineAudioContext` rendering.
- WAV and MP3 export through Mediabunny/LAME WASM.
- Responsive `<automaudio-editor>` Web Component.
- Vanilla JavaScript and Firebase Storage examples.
- Integration skill in `skills/automaudio/SKILL.md`.
- Continuity guides, ADRs, changelog, and GitHub Actions CI.
- DAW-style side controls with manual fader, mute, role, and automation reset.
- Zoom, navigation buttons, `Shift + wheel`, and pan mode.
- Protection for handles dragged beyond track edges.
- Separate manual fader and envelope semantics in playback and mixing.
- Declarative `fullscreen` mode.
- Independent vertical scrolling for tracks and settings with a persistent status bar on desktop.
- English documentation, UI copy, status messages, errors, and test descriptions.
- GitHub repository metadata and ignored unlicensed local audio fixtures.
- Internal development-continuity index in `.codex/README.md`, outside the public README and npm package.
- Self-contained `?demo=1` playground mode and a five-track screenshot for GitHub and npm documentation.

## Latest successful checks

- `npm run check`: passed.
- Unit tests: 11 of 11 passed.
- ESM build and TypeScript declarations: passed.
- `npm pack --dry-run`: passed; 23 files in the tarball at the time of verification.
- Runtime dependency audit: no vulnerabilities found.
- Chrome playground check: component visible with no console errors.
- `silenceDurationMs` slider: UI and state updates verified.
- `skills/automaudio/SKILL.md` validation: passed.
- Five local MP3 files loaded in the playground: passed.
- Auto ducking: 2 voice segments and 22 rendered handles.
- Drag-to-pan: timeline scrolled from 0 to 200 px.
- Handle dragged beyond an edge: count remained 22 and restoration was confirmed.
- Music fader at 70% during playback: value remained stable with no console errors.
- Real-audio gain diagnostic: measured RMS ratio `0.400`, expected `0.400`.
- WAV export completed in the UI; the browser driver did not intercept the Blob download.
- Full-viewport playground without an outer centered container: passed.
- Full-screen playground with five tracks: status bar remained at the bottom and the central workspace stayed within the viewport.
- Initial GitHub Actions run on `main`: passed; action runtimes were then updated to current v7 releases.
- Synthetic five-track demo: loaded successfully, detected 6 voice segments, and rendered ducking handles on four secondary tracks.

## Checks still required

- Real MP3 export in target browsers.
- Safari and Firefox compatibility.
- End-to-end tests with redistributable audio fixtures.
- Memory and performance measurements for long mixes.
- Human listening comparison of the exported WAV.
- Clipping checks when several tracks play together.

## Recommended next step

Automate the manually verified real-audio workflow using redistributable fixtures:

1. a voice track with two segments separated by a long silence;
2. continuous music;
3. load both files in the Web Component;
4. apply ducking;
5. verify envelope points;
6. export WAV and MP3 and verify duration, MIME type, and gain.

Only then begin npm beta preparation.

## Decisions to confirm before release

- MIT is currently the preliminary license choice.
- Minimum supported browsers.
- Whether to add a default “Podcast” preset.

## How to resume

```bash
npm install
npm run check
npm run dev
```

Open `http://localhost:5173`, read this file, and choose the first relevant incomplete item in `todolist.md`.
