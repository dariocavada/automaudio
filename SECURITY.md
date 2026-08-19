# Security policy

Automaudio processes audio files in the browser. Do not send files, signed URLs, or configuration to external services without explicit consent from the host application.

## Reporting

A private vulnerability reporting channel will be defined before publication. Until then, do not disclose credentials, tokens, or exploitable details in public issues.

## Sensitive areas

- Remote URLs and CORS configuration.
- Untrusted audio files and memory consumption during decoding.
- MP3 encoder workers and WebAssembly.
- A future server fallback and SSRF risk.
- Signed Firebase URLs and access-controlled resources.

Any future backend must enforce limits on size, duration, track count, protocols, allowed hosts, and output size.
