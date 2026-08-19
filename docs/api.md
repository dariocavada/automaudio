# API

## `Automaudio`

### Construction

```ts
const audio = new Automaudio({
  project,
  assetResolver: async (source) => getMyAsset(source.value),
})
```

### Tracks

- `addTrack(track)` adds a track. The first track automatically becomes `primary`.
- `updateTrack(id, patch)` updates a name, volume, position, role, or envelope.
- `removeTrack(id)` removes a track.
- `setPrimaryTrack(id)` makes one track the only primary voice.
- `registerAsset(key, blob)` connects a runtime file to an `asset` source.
- `decodeTrack(id)` returns the decoded `AudioBuffer`.

### Ducking

- `updateDucking(partialSettings)` updates and normalizes settings.
- `applyAutoDucking()` detects voice segments and updates secondary envelopes.

Volume values are linear from `0` to `1`; they are not decibels.

`track.volume` is the manual fader. Each `envelope[].volume` value is an automation multiplier: the mixer calculates final gain by multiplying the two. WaveSurfer receives a scaled copy so it can display absolute gain without changing persisted state.

### Persistence and export

- `getProject()` returns a safe copy of the current state.
- `exportProject()` produces formatted JSON.
- `importProject(jsonOrProject)` validates and replaces the state.
- `renderMix()` returns the final `AudioBuffer`.
- `exportWav()` and `exportMp3()` return a `Blob`.

### Headless events

```ts
const unsubscribe = audio.on('change', (project) => save(project))
audio.on('status', ({ message }) => console.log(message))
audio.on('ducking', ({ segments }) => console.log(segments))
```

## `<automaudio-editor>`

Public methods: `addTrack`, `loadProject`, `getProject`, `applyAutoDucking`, and `exportMix`.

Add `fullscreen` to make the editor fill the viewport. On desktop, track and settings panels scroll independently while the status bar remains visible.

The editor includes a DAW-style control column, zoom, step navigation, `Shift + wheel`, and Pan mode. Handles are not deleted when dragged beyond an edge; the `Reset aut.` button explicitly removes a track's complete envelope.

DOM events:

- `automaudio-change`, with the project in `event.detail`;
- `automaudio-error`, with the error in `event.detail`.
