# ADR 0001: Headless engine and Web Component

Status: accepted.

Date: August 19, 2026.

## Context

Automaudio must work both as a ready-to-use editor and inside applications with a custom UI.

## Decision

The package exposes two entrypoints:

- `@dariocavada/automaudio` for the engine, analysis, mixer, persistence, and export;
- `@dariocavada/automaudio/element` to register `<automaudio-editor>`.

WaveSurfer belongs to the UI layer and is not a domain dependency.

## Consequences

- Different frameworks can share the same engine.
- The headless API can be tested without a DOM.
- The Web Component provides a default UX without requiring React or Vue.
- UI and engine must explicitly synchronize state.
