# Optional server fallback

The initial version performs analysis, mixing, and encoding in the browser. A backend is not required for the normal workflow.

For very long projects, a Firebase Function could later accept project JSON and signed URLs, reconstruct the envelopes with FFmpeg, and save the MP3 to Storage. Such a backend must validate duration, track count, allowed URLs, and output size. It must never accept arbitrary URLs without SSRF protection.
