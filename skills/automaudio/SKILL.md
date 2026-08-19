---
name: integrate-automaudio
description: Integrate the @dariocavada/automaudio browser package when an application needs multitrack audio, voice-aware automatic ducking, project persistence, or client-side MP3/WAV export.
---

# Integrate Automaudio

Use the Web Component for a complete editor and the `Automaudio` class for a custom UI or background workflow.

## Essential decisions

- Prefer `<automaudio-editor>` unless the host requires full control over rendering.
- Use exactly one `primary` voice track; treat music and effects as `secondary`.
- Store persistent files outside the project JSON. Use `url` sources for stable CORS-enabled URLs or `asset` sources with `registerAsset`/`assetResolver`.
- Treat `minVolume` and `maxVolume` as linear automation gains multiplied by each track's manual volume.
- Run `applyAutoDucking()` again after changing detection settings or replacing the voice track.
- Keep WAV available as a fallback. MP3 encoding is lazy-loaded and uses additional browser memory.

## Integration workflow

1. Install `@dariocavada/automaudio` and its `wavesurfer.js` peer dependency.
2. Choose the Web Component entrypoint (`/element`) or the headless entrypoint.
3. Add the voice first or explicitly set its role to `primary`.
4. Add secondary tracks, configure ducking with the simplest controls appropriate to the host, and apply it.
5. Persist `exportProject()` output together with durable audio asset identifiers.
6. Restore the assets before analysis or export, then call `importProject()`.
7. Surface CORS, unsupported codec and missing local-file errors to the user.

Read [the API guide](../../docs/api.md) for methods and events. Read [the Firebase guide](../../docs/firebase.md) only for Firebase Storage integrations. Read [the architecture](../../docs/architecture.md) when changing detection, envelopes, rendering, or persistence.

## Validation

- Confirm the host build can resolve both package entrypoints.
- Verify that a long silence in the voice restores the secondary gain and a short pause does not.
- Export both WAV and MP3 with real audio before shipping.
- Test the target browser with representative duration, channel count and codec combinations.
