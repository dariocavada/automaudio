# ADR 0003: Audio files outside project JSON

Status: accepted.

Date: August 19, 2026.

## Context

Local files, Firebase Storage, CDNs, and application databases use different access mechanisms. Embedding base64 audio would make project JSON unnecessarily large.

## Decision

Projects serialize references only:

- `url` for persistent CORS-accessible resources;
- `asset` for application-resolved keys or runtime files.

Bytes are supplied through `registerAsset()` or `assetResolver`.

## Consequences

- JSON stays small and can be stored anywhere.
- Local files must be selected again after a reload.
- The host application controls authentication and storage.
