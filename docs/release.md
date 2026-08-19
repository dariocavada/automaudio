# Release procedure

Do not run this procedure without explicit maintainer authorization.

## Preparation

1. Complete the beta section in `todolist.md`.
2. Confirm the license, repository URL, and supported browsers.
3. Move appropriate entries from `Unreleased` to a dated version in `CHANGELOG.md`.
4. Update the version without automatically creating unwanted tags.

## Validation

```bash
npm ci
npm run check
npm run pack:check
```

Install the tarball in a clean project and test both entrypoints.

## Publishing

The scoped package must be public. The planned publication uses provenance and requires an account authorized for the `@dariocavada` scope.

```bash
npm publish --access public
```

After publication, install the registry version, repeat the real-audio workflow, and only then create a GitHub release if desired.
