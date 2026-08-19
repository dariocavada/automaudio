# ADR 0002: Browser-first processing and export

Status: accepted, with limits still to measure.

Date: August 19, 2026.

## Context

The component must be reusable without requiring a server and must work with local files.

## Decision

Analysis, mixing, and export run in the browser:

- Web Audio API for decoding and rendering;
- `OfflineAudioContext` for mixing;
- PCM WAV as a fallback;
- Mediabunny with LAME/WASM for MP3.

A backend will only be considered as a fallback for projects too large for browser memory.

## Consequences

- Files can stay on the user's device.
- Initial integration requires no infrastructure.
- Memory use grows with duration, sample rate, and channel count.
- Format and decoding support depend on browser capabilities.
