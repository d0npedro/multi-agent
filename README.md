# Agent Collective

Interactive multi-agent AI collective simulator with a live node-graph dashboard.

Agents (Coder, Researcher, Trader, Monitor, Creative, Critic) claim tasks, message along connections, fail and recover, and improve skill over time. Inject external events and watch the collective react.

## Repository

- **Default branch:** `main`
- **GitHub:** https://github.com/d0npedro/multi-agent
- **Clone:** `git clone https://github.com/d0npedro/multi-agent.git`
- **Production (Vercel):** https://multi-agent-six-murex.vercel.app

## Stack

- React + Vite + TypeScript
- Pure TypeScript simulation engine (testable without React)
- React Flow graph canvas
- Zustand app store
- localStorage scenario save/load
- Vitest unit tests
- Vercel static hosting (`vercel.json`)

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test              # unit tests (simulation engine)
npm run build         # production build (base `/`)
npm run build:subpage # production build for /multi-agent/ subpath
npm run preview       # serve production build
```

## Deploy (Vercel)

```bash
npx vercel --prod
```

Or import this GitHub repo in the Vercel dashboard (Framework: Vite, Output: `dist`).

SPA rewrites and build settings live in `vercel.json`.

### Subpage under peddavommond.de

Full instructions for the peddavommond.de agent:

→ **[docs/HANDOVER-peddavommond.md](./docs/HANDOVER-peddavommond.md)**

Summary:

1. Build with base path: `npm run build:subpage` (assets under `/multi-agent/`)
2. Deploy this project on Vercel
3. On the main peddavommond.de site, rewrite `/multi-agent` → this deployment (or copy `dist/` into that path)
4. Verify `https://peddavommond.de/multi-agent/` loads **Agent Collective** with no asset 404s

Base path is controlled by Vite `base` (`BASE_PATH` / `VITE_BASE` env, or `vite build --base /multi-agent/`).

## Features

- Create, name, configure, and remove agents by role
- Drag edges between agent nodes to form workflows
- Play / pause / step / speed controls
- Live logs, resources, metrics, and task board
- External events: resource shortage, market change, agent failure
- Save and load scenario setups

## Architecture

```
src/sim/     → pure engine (tick, agents, tasks, events, metrics)
src/store/   → Zustand bridge + scenario I/O
src/components/ → graph + dashboard UI
docs/        → deployment handover for peddavommond.de
```

The engine owns truth. Each tick produces state the UI snapshots and renders.
