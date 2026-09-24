# Contributing to Automaudio

## Setup

A current Node.js release and npm are required.

```bash
npm install
npm run dev
```

## Workflow

1. Read `AGENTS.md` and `docs/architecture.md`.
2. Choose an existing GitHub issue or describe the proposed change in a new issue.
3. Keep the change focused and add relevant tests.
4. Run `npm run check`.
5. Verify the playground after every audio or UI change.
6. Record validation in the pull request and update the changelog when appropriate.

## API compatibility

The API may still change before the first public release, but every change must be recorded in the changelog. After publication, incompatible changes require a major release or an explicit migration path.

Every change to `AutomaudioProject` must consider:

- incrementing `schemaVersion`;
- parsing or migrating earlier projects;
- updating `docs/api.md`;
- JSON round-trip tests.

## Pull requests

A pull request should describe the changed behavior, completed checks, known limitations, and any effect on package size.
