# casa

Home control app on top of Home Assistant: a wall panel (Fully Kiosk tablet), a web app, and later a mobile app.

## Architecture

- **Live state** — clients talk to Home Assistant directly over WebSocket (`home-assistant-js-websocket`), authenticated with **HA's own OAuth**. No long-lived HA token anywhere; each user signs in with their HA account.
- **Backend** — Next.js route handlers on Vercel for what HA doesn't know: pending devices (MongoDB Atlas) and Google Calendar. Requests carry the user's HA access token, which the backend validates against HA.
- **Shared code** — `packages/core` holds the HA connection, entity store and hooks, written without DOM APIs so the future Expo app can reuse it.

```
apps/web        Next.js app (Vercel)
apps/mobile     Expo app (later)
packages/core   HA connection, registries, entity store, React hooks, API client
```

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill it in
pnpm dev                                        # http://localhost:3000
```

### Home Assistant

Allow the app's origins in `configuration.yaml` (needed for the OAuth token exchange from the browser), then restart HA:

```yaml
http:
  cors_allowed_origins:
    - http://localhost:3000
    - https://<your-vercel-domain>
```

### MongoDB

```bash
pnpm --filter @casa/web db:setup                      # collection, validator, indexes
pnpm --filter @casa/web db:setup /path/to/census.json # …and seed pending devices
```

The device census is private and lives outside this repo.

### Google Calendar (one-off)

1. In Google Cloud Console, add `http://localhost:3000/api/google/callback` and `https://<your-vercel-domain>/api/google/callback` as authorized redirect URIs.
2. Open `/api/google/connect?secret=<SETUP_SECRET>` and grant access. The refresh token is stored encrypted (AES-256-GCM) in Mongo.

### Vercel

Import the repo, set **Root Directory** to `apps/web`, and add the variables from `.env.example`.

## Keep this repo free of house data

No HA URL, entity IDs, IPs or census data in code. Everything instance-specific goes in env vars or Mongo.
