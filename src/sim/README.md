# Simulation engine

Pure TypeScript. No React, no DOM, no store.

The UI never mutates simulation fields directly. It calls functions exported from `index.ts`, then snapshots the resulting `SimState`.

| Module | Responsibility |
| --- | --- |
| `types.ts` | Shared domain types and role → task mapping |
| `rng.ts` | Seeded PRNG so runs are reproducible |
| `engine.ts` | Tick loop, agents, tasks, messages, events, metrics |
| `scenarioStorage.ts` | localStorage adapters for named setups |
| `engine.test.ts` | Vitest coverage of the rules above |

Entry points: `createSim`, `createDefaultCollective`, `tick` / `tickMany`, `addAgent`, `addConnection`, `injectEvent`, `serializeScenario`, `loadScenario`.
