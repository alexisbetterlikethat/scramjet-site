# Production deployment

Always build before serving in production. Development mode (`static/`) exposes default paths such as `/uv/` and `/wisp/` that are randomized in production.

```bash
pnpm install
pnpm build
pnpm start
```

## What the build changes

Each `pnpm build` generates a fresh `dist/` with:

- Random proxy scope (replaces `/uv/`)
- Random Scramjet and Scrambled Eggs subpaths
- Random Wisp WebSocket path (replaces `/wisp/`)
- Random service worker filename
- Obfuscated application and vendor JavaScript
- Encoded games/apps catalog paths

The server reads `dist/.runtime/vendor-map.cjs` and serves `dist/` automatically when it exists.

## `config.js` options

| Option | Purpose |
|--------|---------|
| `requireBuild` | Log a warning when `dist/` is missing |
| `externalWisp` | Default Wisp URL (users can still override in Settings) |
| `pageRoutes` | URL paths for games and apps pages (default `/g` and `/a`) |
| `gamesHost` | Redirect games/apps page routes to another origin |
| `disableGamesOnMainHost` | Remove games, apps, gh-games, and hosted routes from this host |
| `scramjetOnly` | Hide Ultraviolet and skip loading it in the service worker |
| `proxyRateLimit` | Rate limit for proxy scope and Wisp paths |
| `challenge` | HTTP basic auth gate |

### Example: proxy-only main site

```js
gamesHost: "https://games.example.com",
disableGamesOnMainHost: false,
scramjetOnly: true,
externalWisp: null,
```

Deploy the full site (with games) to `games.example.com`. Deploy a slim build to your main domain with `gamesHost` pointing at the games deployment.

### Example: external Wisp

```js
externalWisp: "wss://tunnel.example.com/sync/",
```

## Rotating paths

Rebuild and redeploy when proxy URLs are widely shared. Paths are tied to the build id in `vendor-map.cjs`.

## Do not

- Serve `static/` directly in production when `requireBuild` is enabled
- Commit `dist/` to git (generated output)
- Publish your domain on public unblock lists if you want a low profile
