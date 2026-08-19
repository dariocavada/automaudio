# Testing strategy

## Current automated tests

- `tests/ducking.test.ts`: voice segmentation and envelope points.
- `tests/project.test.ts`: normalization and JSON persistence.
- `tests/wav.test.ts`: PCM WAV header and size.
- `tests/gain.test.ts`: fader/envelope composition and WaveSurfer adaptation.

Run:

```bash
npm test
npm run typecheck
npm run build
```

## Browser tests to add

Fixtures must be generated synthetically or have a documented redistribution license. The minimum test should cover loading, voice selection, ducking, setting changes, JSON save, and export.

## Manual pre-release matrix

| Area | Minimum cases |
| --- | --- |
| Browsers | Chrome, Safari, Firefox |
| Formats | WAV, MP3, M4A/AAC where supported |
| Channels | mono, stereo |
| Duration | 30 s, 10 min, 30 min |
| Tracks | 1 voice + 1, 3, and 8 secondary tracks |
| Sources | local file, CORS URL, Firebase Storage |
| Export | WAV, MP3 |

Record results in `docs/project-status.md` and add specific tasks to `todolist.md` for each reproducible issue.

## Local fixtures and diagnostic

All contents of `tests/res/` are intentionally ignored by Git. To use the fixture shortcuts, add local files with these names: `test-voice.mp3`, `test-music.mp3`, `test-effect.mp3`, `test-effect2.mp3`, and `test-effect3.mp3`.

```text
http://localhost:5173/?fixtures=1
```

Use `?fixtures=short` for a shorter check. To measure mixer gain with a local real-audio file, use:

```text
http://localhost:5173/?diagnostics=gain
```

The diagnostic renders volume `0.8` with envelope `0.5`; the expected RMS ratio is `0.4`. The result is shown in `#gain-diagnostic`.
