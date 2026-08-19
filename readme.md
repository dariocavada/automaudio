# Automaudio

A multitrack browser audio editor with voice-aware automatic ducking. Voice stays clear while music and effects are lowered only when needed, then return during sufficiently long pauses.

The project provides both a UI-independent TypeScript engine and the `<automaudio-editor>` Web Component, ready to use with JavaScript, React, Vue, Svelte, or a plain HTML page.

## Status

Version `0.1.0` includes a working initial implementation:

- multiple audio file and URL loading;
- primary voice track selection;
- configurable RMS-based voice detection;
- voice threshold, minimum pause, attack, release, and minimum/maximum automation gain;
- editable envelopes powered by `wavesurfer-multitrack`;
- JSON project save and restore;
- in-browser mixing with `OfflineAudioContext`;
- WAV and MP3 export with LAME/WebAssembly;
- responsive Web Component and headless API;
- DAW-style track controls, zoom, navigation buttons, and pan mode.

## Installation

```bash
npm install @dariocavada/automaudio wavesurfer.js
```

The package is configured for publication as a public scoped npm package.

## Web Component

```html
<script type="module">
  import '@dariocavada/automaudio/element'
</script>

<automaudio-editor></automaudio-editor>
```

Add the `fullscreen` attribute for a full-page editor like the included playground:

```html
<automaudio-editor fullscreen></automaudio-editor>
```

Users can load voice and secondary tracks directly from the interface. The first file becomes the primary voice track, and this can be changed at any time.

To add a remote file programmatically:

```js
const editor = document.querySelector('automaudio-editor')

await editor.addTrack({
  label: 'Voice',
  role: 'primary',
  source: { type: 'url', value: '/audio/voice.mp3' },
})

await editor.addTrack({
  label: 'Music',
  role: 'secondary',
  source: { type: 'url', value: '/audio/music.mp3' },
  volume: 0.9,
})

await editor.applyAutoDucking()
```

Remote URLs must allow CORS requests for both WaveSurfer and Web Audio decoding.

## Headless API

```js
import { Automaudio } from '@dariocavada/automaudio'

const audio = new Automaudio()

audio.addTrack({
  label: 'Voice over',
  role: 'primary',
  source: { type: 'url', value: voiceUrl },
})

audio.addTrack({
  label: 'Soundtrack',
  source: { type: 'url', value: musicUrl },
})

audio.updateDucking({
  thresholdDb: -40,
  silenceDurationMs: 700,
  minVolume: 0.2,
  maxVolume: 1,
  attackMs: 100,
  releaseMs: 400,
})

await audio.applyAutoDucking()
const mp3 = await audio.exportMp3()
```

## How ducking works

The voice audio is split into small windows. RMS energy is calculated for each window and compared with `thresholdDb`. Pauses shorter than `silenceDurationMs` remain part of the same voice segment; during longer pauses, music gradually returns to `maxVolume`.

The two automatic levels are multipliers applied to each track's manual volume:

- `minVolume`: level while voice is present;
- `maxVolume`: level during pauses;
- `attackMs`: how quickly music is lowered;
- `releaseMs`: how quickly music returns;
- `minVoiceDurationMs`: filters out clicks and very short noises.

The track fader remains independent from automation: final gain is always `manual volume × envelope`. Playback and export use the same semantics.

## JSON projects and audio sources

The JSON contains settings, tracks, and envelopes, but does not embed audio file bytes.

- `url` sources can be restored directly while they remain reachable.
- `asset` sources represent local files or application-specific keys. After reloading, they must be supplied again through `registerAsset()` or `assetResolver`.
- With Firebase Storage, store a persistent download URL in the project or resolve an application key through an adapter.

See [docs/api.md](docs/api.md), [docs/architecture.md](docs/architecture.md), and [docs/firebase.md](docs/firebase.md) for details.

## Resuming development

The repository contains persistent documentation designed to make development easy to resume after a break or in a new session:

- [AGENTS.md](AGENTS.md): rules, invariants, and reading order;
- [docs/project-status.md](docs/project-status.md): current snapshot, completed checks, and next step;
- [todolist.md](todolist.md): roadmap toward the beta release;
- [CHANGELOG.md](CHANGELOG.md): added or changed behavior;
- [docs/decisions](docs/decisions): architecture decisions and rationale;
- [CONTRIBUTING.md](CONTRIBUTING.md): development workflow;
- [docs/testing.md](docs/testing.md) and [docs/release.md](docs/release.md): testing and publishing.

At the end of each development session, `docs/project-status.md`, `todolist.md`, and `CHANGELOG.md` should reflect the work that was actually completed.

## Development

```bash
npm install
npm run dev
npm run check
npm run pack:check
```

The local demo is served from `dev/client`. Before publishing to npm, complete the checklist in [todolist.md](todolist.md). The workflow in `.github/workflows/ci.yml` repeats type checking, tests, build, and tarball validation.

Local, non-versioned fixtures can be placed in `tests/res` and loaded automatically during development:

```text
http://localhost:5173/?fixtures=1
```

The timeline supports zoom, navigation buttons, `Shift + wheel`, and a **Pan** mode for dragging the complete arrangement without moving tracks.

## Compatibility and limitations

- Processing requires the Web Audio API and runs locally.
- Long mixes can consume substantial memory because `OfflineAudioContext` produces the complete buffer before encoding.
- Decodable formats depend on the browser; WAV and MP3 are the most interoperable choices.
- The MP3 encoder is loaded only when an export is requested.

## License

MIT. MP3 encoding uses Mediabunny and LAME/WASM; review the dependency licenses before final distribution.
