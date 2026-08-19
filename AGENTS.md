# Automaudio agent guide

This file is the starting point for anyone resuming development, whether human or an AI agent.

## Reading order

1. Read `docs/project-status.md` to understand what works and the recommended next step.
2. Read `todolist.md` for the complete roadmap.
3. Read `docs/architecture.md` and the ADRs in `docs/decisions/` before changing structure or data formats.
4. Consult `docs/api.md` when changing the public API.

## Validation commands

```bash
npm install
npm run check
npm run pack:check
npm run dev
```

`npm run check` must pass before a change is considered complete. Audio and UI changes also require a playground check in `dev/client`.

## Project invariants

- `src/core` and `src/audio` must not depend on WaveSurfer or the UI.
- At most one track may have the `primary` role.
- Volumes are linear gain values from `0` to `1`, not decibels.
- Envelope times are relative to the start of each track.
- Project JSON does not embed audio files and remains versioned through `schemaVersion`.
- Firebase and other storage systems must remain optional adapters.
- WAV must remain available as a fallback for MP3 export.
- Browser-side processing is the primary path; a server is only a possible future fallback.

## Continuity between sessions

At the end of every session that changes the project:

1. update `docs/project-status.md` with status, completed checks, and a concrete next step;
2. update `todolist.md`, marking only work that is actually complete;
3. update `CHANGELOG.md` when behavior, API, dependencies, or public documentation changes;
4. add or update tests for every deterministic behavior change;
5. run `npm run check` and record any checks that were not performed.

## Security and releases

- Do not publish to npm or create releases or tags without explicit user authorization.
- Do not add audio fixtures without a compatible, documented redistribution license.
- Do not accept arbitrary URLs in a future backend without SSRF mitigations.
- Do not commit credentials, npm tokens, or private Firebase configuration.

## Conventions

- Strict TypeScript, ESM modules, browser-first API.
- Code names, APIs, documentation, and UX copy are written in English.
- Prefer pure functions for audio analysis and serialization.
- Every new persistent option requires a schema compatibility decision.
