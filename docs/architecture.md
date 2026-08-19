# Architecture

Automaudio separates the audio domain from rendering:

```text
src/core/       state, serialization, and the Automaudio API
src/audio/      voice detection, envelopes, rendering, and WAV
src/export/     dynamically loaded MP3 encoder
src/ui/         Web Component and WaveSurfer integration
dev/client/     development playground
dev/examples/   minimal integrations
dev/server/     notes for an optional server fallback
tests/          deterministic domain tests
skills/         integration instructions for AI agents
```

`Automaudio` does not depend on WaveSurfer. The UI can therefore be replaced while retaining analysis, JSON schema, and export behavior.

## Ducking flow

1. The `primary` track is decoded into an `AudioBuffer`.
2. `detectVoiceSegments` calculates RMS energy over time windows.
3. Frames above the threshold form voice segments; short pauses are merged.
4. `createDuckingEnvelope` converts global segments into local points for each secondary track.
5. WaveSurfer displays the points and allows manual correction.
6. The mixer applies manual volume × automation envelope in an `OfflineAudioContext`.

## Persistence

The JSON schema is versioned through `schemaVersion`. Binary files stay outside JSON so the host application can choose its storage system.

An `assetResolver` maps an application source to a `Blob`, `ArrayBuffer`, or URL. This keeps Firebase and other storage providers optional.
