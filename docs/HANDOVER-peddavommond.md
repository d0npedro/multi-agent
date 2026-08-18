# Handover: Agent Collective → peddavommond.de

Operator notes for the **peddavommond.de** deploy agent.

Canonical deploy steps live in **[deployment.md](./deployment.md)**. This file only records the site-specific contract.

| Item | Value |
| --- | --- |
| GitHub | https://github.com/d0npedro/multi-agent |
| Default branch | `main` |
| Live production | https://multi-agent-six-murex.vercel.app |
| Vercel project | `peters-projects-1631d4ab/multi-agent` |
| Recommended public path | `https://peddavommond.de/multi-agent/` |
| Subpage build | `npm run build:subpage` (base `/multi-agent/`) |

## Checklist

- [ ] `git checkout main && git pull origin main`
- [ ] `npm ci && npm test && npm run build` (root) or `npm run build:subpage` (subpath)
- [ ] Production deploy green
- [ ] If subpage: rewrites on the main site, assets `200` from `/multi-agent/assets/…`
- [ ] Smoke: dark dashboard titled **Agent Collective**, Play advances the tick

Do not add LLM APIs, env secrets, or a backend for the default sim. Do not redesign the dashboard for hosting — only build flags and routing.
