# Handover: Agent Collective → peddavommond.de agent

This document is for the **peddavommond.de** deploy agent. It covers clone/pull, Vercel root deploy, and hosting the same SPA as a **subpage** under `peddavommond.de` (default path: `/multi-agent/`).

## What this is

Interactive multi-agent collective simulator (React + Vite SPA). No backend. Build output is static files in `dist/`.

## Repository

| Item | Value |
|------|--------|
| Local project | `D:\Projects\multi-agent` (or clone path) |
| Default branch | `main` |
| GitHub | https://github.com/d0npedro/multi-agent |
| Clone (HTTPS) | `git clone https://github.com/d0npedro/multi-agent.git` |
| Pull updates | `git checkout main && git pull origin main` |
| Live production URL | https://multi-agent-six-murex.vercel.app |
| Vercel project | `peters-projects-1631d4ab/multi-agent` (linked to the GitHub repo) |

### Clone & verify locally

```bash
git clone https://github.com/d0npedro/multi-agent.git
cd multi-agent
npm install
npm test
npm run build
npm run dev   # http://localhost:5173
```

## Vercel — root deploy (standalone URL)

Framework: **Vite**. Output: **`dist`**. Config file: **`vercel.json`** (SPA rewrite to `index.html`).

```bash
# from repo root, logged in to Vercel CLI
npm install
npx vercel link          # once per machine/project
npx vercel --prod        # production deploy
```

Or import the GitHub repo in the Vercel dashboard:

1. New Project → Import Git Repository → this repo
2. Framework Preset: Vite (auto from `vercel.json`)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Deploy

Confirm: open the production URL; HTML title/shell should mention **Agent Collective**.

**Already deployed production alias:** https://multi-agent-six-murex.vercel.app  
(Dashboard inspect may show deployment-specific `*.vercel.app` hostnames as well.)

## Subpage under peddavommond.de (`/multi-agent/`)

Asset paths must **not** assume site root `/`. This repo supports a build-time base path.

### Chosen path

- **Recommended subpath:** `/multi-agent/`
- Live target shape: `https://peddavommond.de/multi-agent/` (or `www` as you use)

### Build with base path

```bash
# Preferred script (base baked into asset URLs)
npm run build:subpage

# Equivalent
npx vite build --base /multi-agent/

# Or env (read by vite.config.ts)
# Unix:
BASE_PATH=/multi-agent/ npm run build
# PowerShell:
$env:BASE_PATH="/multi-agent/"; npm run build
```

After a subpage build, `dist/index.html` must reference assets as `/multi-agent/assets/...` (not `/assets/...`).

### Hosting options (pick one)

#### Option A — Separate Vercel project + domain path (recommended)

1. Deploy this repo as its own Vercel project with **Production** env or build override:
   - Build Command: `npm run build:subpage`
   - Output: `dist`
2. On the **peddavommond.de** Vercel project (main site), add a rewrite/proxy to this project, **or** attach `peddavommond.de` and use a path rewrite:
   - Source: `/multi-agent/:path*`
   - Destination: the multi-agent deployment URL + `/:path*`  
   (Dashboard: Project → Settings → Domains / rewrites, or `vercel.json` on the **main site**.)

Example main-site rewrite (on peddavommond.de project, not this repo):

```json
{
  "rewrites": [
    {
      "source": "/multi-agent",
      "destination": "https://<multi-agent-project>.vercel.app"
    },
    {
      "source": "/multi-agent/:path*",
      "destination": "https://<multi-agent-project>.vercel.app/:path*"
    }
  ]
}
```

**Important:** the multi-agent app must be built with `base: /multi-agent/` so JS/CSS URLs match the public path. If you proxy without stripping the prefix, destination should keep `/multi-agent/...` consistent with how Vercel serves that project—prefer serving the SPA **at project root** of the multi-agent deployment while the **public** URL path is `/multi-agent/` via reverse rewrite; then either:

- Build with `base: /multi-agent/` and rewrite so external path maps onto the same path on the target, **or**
- Build with `base: /` and strip the prefix in the rewrite destination.

Simplest consistent approach for this repo:

1. `npm run build:subpage` (base `/multi-agent/`)
2. Multi-agent Vercel project serves `dist` at its root **but** assets expect `/multi-agent/...`
3. Map domain path so browser requests `https://peddavommond.de/multi-agent/` and `https://peddavommond.de/multi-agent/assets/*` hit this project’s files at the same paths.

If path mapping is awkward, use **Option B**.

#### Option B — Subdirectory inside an existing static/export host

Copy `dist/` contents into the main site’s public folder at `public/multi-agent/` (or equivalent) **after** `npm run build:subpage`. SPA fallback: any missing path under `/multi-agent/*` should serve `/multi-agent/index.html`.

#### Option C — Second Vercel project, link only

Keep `https://<project>.vercel.app` as the live app and only link from peddavommond.de. No base path required (`npm run build`). Fastest if a true subpath is not required.

### SPA fallback

`vercel.json` already rewrites non-asset routes to `index.html` for this project. For a nested path on another project, ensure `/multi-agent/*` falls back to the SPA entry under that base.

### Verify subpage

```bash
npm run build:subpage
# Confirm asset prefix in dist/index.html
# grep or open dist/index.html — script/link hrefs should start with /multi-agent/

# Local check
npx vite preview --base /multi-agent/ --host 127.0.0.1 --port 4174
# open http://127.0.0.1:4174/multi-agent/
```

Production checks:

1. `GET https://peddavommond.de/multi-agent/` → 200, HTML contains Agent Collective
2. Network tab: JS/CSS load from `/multi-agent/assets/...` (no 404s)
3. Create an agent / press Play — UI responds (SPA is client-side)

## DNS / domain (out of scope for the simulator repo agent)

- DNS for `peddavommond.de` stays on the main site’s Vercel project or registrar.
- This goal does **not** require moving apex DNS; only path routing or a linked deploy URL.
- Custom domain on the multi-agent project is optional.

## Quick checklist for peddavommond.de agent

- [ ] Clone/pull `main` from the GitHub remote
- [ ] `npm ci` or `npm install`
- [ ] `npm test` and `npm run build` (root) or `npm run build:subpage` (subpath)
- [ ] Vercel project linked; production deploy green
- [ ] If subpage: base path `/multi-agent/`, rewrites on main site, asset 200s
- [ ] Smoke: open URL, see dark dashboard + “Agent Collective”

## Support files in this repo

| File | Purpose |
|------|---------|
| `vercel.json` | Vite framework, `dist` output, SPA rewrites |
| `vite.config.ts` | `base` from `BASE_PATH` / `VITE_BASE` or CLI `--base` |
| `package.json` | `build`, `build:subpage`, `preview:subpage` |
| `README.md` | User-facing run + deploy summary |

## Do not change for deploy

- No need for real LLM APIs, env secrets, or a server for the default sim.
- Do not redesign the simulator for hosting; only build flags and routing.
