# Deploy the browser client

The client in `dev/client` can be hosted as a static website. Audio processing
and export run in the browser. Building or deploying the client does not publish
the library to npm.

## Build and preview

Use Node.js 22 or newer:

```bash
npm ci
npm run check
npm run check:client
npm run preview:client
```

The output is `dist-client/`; the library's separate output is `dist/`.
Open the preview URL printed by Vite. Add `?demo=1` to load five synthetic tracks.
Local audio fixtures and development diagnostics are excluded from production.

## Cloudflare Workers

Create a local configuration from the example, unless one already exists:

```bash
cp -n wrangler.example.jsonc wrangler.jsonc
npx wrangler login
npx wrangler whoami
npm run deploy
```

Choose a unique Worker name in `wrangler.jsonc` and the intended Cloudflare
account before deployment. This configuration is ignored by Git. The example
uses a `workers.dev` address; custom domains can be configured for a zone you own.
Never commit credentials. Consult the
[Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/configuration/)
for account and domain configuration.

`npm run deploy` builds and validates the client, then uploads `dist-client/`.
Verify the deployed editor and synthetic demo in a browser. The repository's
CI validates builds but does not deploy automatically.
