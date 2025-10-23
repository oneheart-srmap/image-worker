# image-worker

A small Cloudflare Worker that fetches images from an R2-compatible bucket, optionally applies Cloudflare image resizing parameters, and edge-caches results using `caches.default`.

This repository contains a minimal, production-minded example showing how to:

- Fetch images from an R2 bucket (dev/public URL by default)
- Apply Cloudflare image resizing options (width, height, quality, fit)
- Store and serve responses from the edge cache (`caches.default`)
- Expose a simple `X-Cache-Status` header to make cache behavior testable

## Table of Contents

- [Getting started](#getting-started)
- [Features](#features)
- [Requirements](#requirements)
- [Configuration](#configuration)
- [Running locally (development)](#running-locally-development)
- [Tests](#tests)
- [Caching behavior](#caching-behavior)
- [Deploying](#deploying)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Getting started

Clone the repo and install dev dependencies (this project uses Wrangler + Vitest for local testing):

```bash
git clone https://github.com/oneheart-srmap/image-worker.git
cd image-worker
npm install
```

## Features

- Edge caching of image responses with `caches.default`.
- Simple integration with Cloudflare Image resizing options via `?w=...&h=...&q=...&fit=...`.
> we have tested and its only works for custom domains
- `X-Cache-Status` header (HIT or MISS) for observability and deterministic testing.

## Requirements

- Node.js (LTS recommended)
- npm or yarn
- Wrangler (for deploy and `wrangler dev`) — dev dependency included
- A Cloudflare account and R2 bucket for production use

## Configuration

By default the worker points to a public R2 dev URL in `src/index.js`. For real deployments you should replace the `r2DevUrl` value or wire a proper R2 binding in `wrangler.toml` / `wrangler.json`.

Key configuration areas:

- `src/index.js` — contains `r2DevUrl` that points to a public R2 dev URL used in tests/dev. Replace this with your own R2 endpoint or use an R2 binding.
- `wrangler.jsonc` / `wrangler.toml` — when deploying, configure R2 bindings, account id, and route or workers.dev subdomain here.

Example (production): set up an R2 binding in `wrangler.toml` and fetch from the R2 binding instead of a public dev URL.

## Running locally (development)

Start Wrangler in dev mode (serves your worker locally and proxies Cloudflare runtime APIs). This project uses mocked R2/dev behavior for tests — configure a real R2 binding for full integration testing.

```bash
# start dev server
npm run dev

# or
wrangler dev
```

Visit the dev URL printed by Wrangler, or request directly with curl:

```bash
curl "http://localhost:8787/profile-11.jpg"
```

To resize through Cloudflare's image resizing (only available on certain plans and proper domains), append query parameters:

```bash
curl "http://localhost:8787/profile-11.jpg?w=300&h=300&q=80&fit=cover"
```

## Tests

This project uses Vitest and the Cloudflare test helpers to run isolated worker tests.

Run tests:

```bash
npm test
```

The tests assert HTTP status codes and that responses include the `X-Cache-Status` header. Example test flow:

1. Fetch an image (first request should be `MISS`)
2. Fetch again in the same execution context (should return `HIT`)

If you see intermittent failures related to temporary files or the runtime date mismatch, update your local Cloudflare runtime or ignore warnings about compatibility dates — they are informational.

## Caching behavior

- The worker first checks `caches.default` with the incoming `Request` object.
- If there's a cached response, the worker returns it and sets `X-Cache-Status: HIT`.
- On a cache miss, the worker fetches the image from R2, wraps the response, sets `Cache-Control: public, max-age=86400` and `X-Cache-Status: MISS`, then stores a clone in `caches.default`.

Note: The default cache key is the full request (URL + query string). If you want cache keys to ignore certain query params (e.g., non-resize params), normalize incoming requests before `cache.match()` and `cache.put()`.

## Deploying

This project is setup to use Wrangler. Configure `wrangler.jsonc` or `wrangler.toml` with your account ID, routes, and bindings.

Basic deploy:

```bash
npm run deploy
# or
wrangler publish
```

When deploying, prefer using R2 bindings rather than an external public dev URL. Update `src/index.js` to fetch from the binding or modify your code to use the binding directly.

## Contributing

Contributions are welcome. Please open issues or pull requests for:

- Fixes and bug reports
- Improved test coverage
- Feature requests (e.g., cache key customization, different cache TTLs, advanced image transformations)

When opening a PR, provide a clear changelog and add/modify tests where appropriate.

## Troubleshooting

- Tests failing with EBUSY temporary directory errors on Windows: try restarting your test runner or your machine. Temporary files can be locked by the OS.
- If `X-Cache-Status` is always `MISS`, ensure your test populates the cache in the same execution context before asserting `HIT` (see tests for example).
- If image resizing parameters are ignored, ensure Cloudflare image resizing is available on your account and that the request is passed to the correct Cloudflare runtime (not all dev setups support the `cf: { image: ... }` option).

## Author
Made with ❤️ by OneHeart Club,SRM-AP

## License

This repository is provided under the GPLv3 License. See `LICENSE` for details.
  