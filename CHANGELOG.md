# Changelog

All notable changes to this project will be documented in this file. The format follows Keep a Changelog; the project will use Semantic Versioning after its first publication.

## Unreleased

### Added

- TypeScript ESM package `@dariocavada/automaudio`.
- Headless `Automaudio` API.
- `<automaudio-editor>` Web Component.
- RMS-based voice segment detection.
- Configurable ducking with threshold, minimum silence, attack, release, and minimum/maximum gain.
- In-browser offline mixing and WAV/MP3 export.
- Versioned JSON persistence and runtime asset adapters.
- Playground, documentation, Firebase examples, and AI integration skill.
- Unit tests for ducking, persistence, WAV encoding, and gain handling.
- Project continuity files, ADRs, testing guide, release procedure, and GitHub Actions CI.
- DAW-style lanes with compact controls beside each waveform.
- Zoom, horizontal navigation, and drag-to-pan mode.
- Repeatable local fixture loading through `?fixtures=1`.
- Real-audio browser gain diagnostic through `?diagnostics=gain`.
- Web Component `fullscreen` mode and full-viewport playground.
- English documentation, UI copy, status messages, errors, and tests.

### Fixed

- The current envelope volume no longer overwrites the manual fader during playback.
- Playback and export apply `manual volume × automation` exactly once.
- Handles dragged beyond the vertical edge are restored instead of disappearing.
- Handles are larger, higher contrast, and visible near track edges.
- WaveSurfer no longer receives a point exactly at the track end, preventing a `NaN` media volume.
- In full-screen mode, tracks and settings scroll without hiding the status bar.
- GitHub Actions use current Node.js 24-based action runtimes without deprecation warnings.

### Known limitations

- End-to-end tests with redistributable real-audio fixtures are still missing.
- Local files must be selected again after a reload.
- The master output does not yet include a limiter.
- Long mixes can require substantial memory.
