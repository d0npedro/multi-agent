# Contributing

Thanks for looking at Agent Collective. The simulation engine is the source of truth; the React dashboard is a view over it. Keep that split.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run lint
npm run build
```

Node 20+ is required.

## Where to change what

| Change | Start here |
| --- | --- |
| Tick rules, roles, events, metrics | `src/sim/` |
| Persist / restore scenarios | `src/sim/scenarioStorage.ts` |
| Play / pause / selection | `src/store/useAppStore.ts` |
| Graph or dashboard UI | `src/components/` |

Engine tests live next to the engine (`src/sim/engine.test.ts`) and must stay runnable **without** a browser or React.

## Pull requests

1. Keep the engine UI-free. Do not import React, Zustand, or DOM APIs from `src/sim/`.
2. Prefer a failing test for behavior changes in the tick loop.
3. `npm test`, `npm run lint`, and `npm run build` should pass.
4. If you change visible UI, regenerate screenshots:

   ```bash
   npm run dev          # in another terminal
   npm run screenshots
   ```

5. Use the PR template. Describe the behavior change, not the file list.
