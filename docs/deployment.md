# Deployment

Static Vite SPA. No server, no secrets, no environment variables for the default simulator.

**Production:** https://multi-agent-six-murex.vercel.app

## Vercel (root)

Framework: **Vite**. Output: **`dist`**. SPA rewrite lives in `vercel.json`.

```bash
npm install
npm test
npx vercel --prod
```

Or import the GitHub repo in the Vercel dashboard (Framework: Vite, output `dist`).

Confirm the HTML title/shell says **Agent Collective**.

## Subpage under `/multi-agent/`

Asset URLs must not assume site root `/`. Build with a base path:

```bash
npm run build:subpage
# equivalent: vite build --base /multi-agent/
```

`dist/index.html` must reference `/multi-agent/assets/…`.

### Option A — own Vercel project + path rewrite (recommended)

1. Deploy this repo with build command `npm run build:subpage`.
2. On the parent site, rewrite `/multi-agent` and `/multi-agent/:path*` to this deployment.

### Option B — copy into another static host

After `npm run build:subpage`, copy `dist/` to `public/multi-agent/` (or equivalent). Missing paths under `/multi-agent/*` must serve that `index.html`.

### Option C — link only

Keep the `*.vercel.app` URL and link to it. Use `npm run build` (base `/`). Fastest if a real subpath is not required.

### Local check

```bash
npm run preview:subpage
# open the /multi-agent/ URL Vite prints
```

Production checks:

1. `GET …/multi-agent/` → 200, HTML contains Agent Collective
2. JS/CSS load from `/multi-agent/assets/…` (no 404s)
3. Create an agent / press Play — the SPA is entirely client-side

Base path is `BASE_PATH` / `VITE_BASE` or `vite build --base /multi-agent/`. See `vite.config.ts`.

Pedda-specific hosting notes: [HANDOVER-peddavommond.md](./HANDOVER-peddavommond.md).
