# Automaudio roadmap

## Completed foundations

- [x] Configure the public `@dariocavada/automaudio` npm package with ESM output and TypeScript declarations.
- [x] Separate engine, audio analysis, mixer, encoder, UI, and examples.
- [x] Implement voice segment detection and configurable ducking.
- [x] Implement minimum/maximum volume, threshold, minimum pause, attack, and release.
- [x] Implement versioned JSON projects and URL/asset sources.
- [x] Implement offline rendering and WAV/MP3 export.
- [x] Create a responsive Web Component based on `wavesurfer-multitrack`.
- [x] Add documentation, playground, Firebase examples, and an AI integration skill.
- [x] Add DAW-style controls with fader, mute, role, and automation reset.
- [x] Add zoom, navigation buttons, horizontal scrolling, and pan mode.
- [x] Keep manual track volume and automation envelope separate in playback and export.
- [x] Improve handle visibility and prevent accidental edge deletion.
- [x] Verify mixer gain against an expected RMS ratio with a real MP3.
- [x] Make the playground full-screen without an outer window or nested page scroll.
- [x] Keep the status bar visible and allow tracks and settings to scroll in full-screen mode.
- [x] Translate documentation, UI copy, messages, and tests into English.
- [x] Add repository, homepage, and issue tracker metadata to `package.json`.

## Before the npm beta

- [ ] Test the interface in desktop Chrome, Safari, and Firefox.
- [ ] Test WAV, MP3, M4A/AAC, mono/stereo audio, and different sample rates.
- [ ] Add browser end-to-end tests with redistributable audio fixtures.
- [ ] Measure time and memory usage with 10-, 30-, and 60-minute mixes.
- [ ] Move analysis and encoding into Web Workers if testing reveals noticeable UI blocking.
- [ ] Add optional normalization or limiting to prevent master clipping.
- [ ] Add undo/redo for movement, envelope edits, and track removal.
- [ ] Confirm the MIT license and complete a transitive dependency license review.
- [ ] Add funding metadata if desired.
- [x] Configure CI for `npm run check` and tarball validation.
- [ ] Configure npm publication with provenance after repository and credentials are ready.

## Publishing

- [ ] Sign in to npm with an account authorized for the `@dariocavada` scope.
- [ ] Run `npm run check` and `npm run pack:check`.
- [ ] Inspect the tarball, increment the version, and update the changelog.
- [ ] Publish with `npm publish --access public`.
- [ ] Install the published package in a clean project and repeat the complete workflow.

## Future improvements

- [ ] Official React and Vue adapters if the Web Component is insufficient for those ecosystems.
- [ ] Optional persisted waveform peaks for faster loading.
- [ ] “Podcast”, “Voice over”, and “Interview” presets.
- [ ] Optional Firebase Function fallback for files too large for browser memory.
