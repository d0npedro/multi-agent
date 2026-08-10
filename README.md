# Agent Collective

Interactive multi-agent AI collective simulator with a live node-graph dashboard.

Agents (Coder, Researcher, Trader, Monitor, Creative, Critic) claim tasks, message along connections, fail and recover, and improve skill over time. Inject external events and watch the collective react.

## Stack

- React + Vite + TypeScript
- Pure TypeScript simulation engine (testable without React)
- React Flow graph canvas
- Zustand app store
- localStorage scenario save/load
- Vitest unit tests

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test        # unit tests (simulation engine)
npm run build   # production build
npm run preview # serve production build
```

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
```

The engine owns truth. Each tick produces state the UI snapshots and renders.
