import {
  type Agent,
  type AgentRole,
  type AgentStatus,
  type Connection,
  type CreateAgentInput,
  type ExternalEvent,
  type LogEntry,
  type LogLevel,
  type Message,
  type Metrics,
  type Resources,
  type ScenarioConfig,
  type SimState,
  type Task,
  type TaskType,
  ALL_ROLES,
  ROLE_TASK_MAP,
  TASK_TITLES,
} from './types';
import { nextSeed, pick, uid } from './rng';

const MAX_LOGS = 200;
const MAX_MESSAGES = 100;
const RECOVERY_TICKS = 5;
const TASK_SPAWN_BASE = 0.35;

function emptyMetrics(): Metrics {
  return {
    tasksCompleted: 0,
    tasksFailed: 0,
    messagesSent: 0,
    totalFailures: 0,
    totalRecoveries: 0,
    avgSkill: 0,
    throughput: 0,
    uptime: 1,
  };
}

function defaultResources(): Resources {
  return {
    compute: 80,
    energy: 80,
    budget: 100,
    marketDemand: 1,
  };
}

function pushLog(
  state: SimState,
  level: LogLevel,
  message: string,
  agentId?: string,
): void {
  const entry: LogEntry = {
    id: `log_${state.tick}_${state.logs.length}_${Math.random().toString(36).slice(2, 7)}`,
    tick: state.tick,
    level,
    message,
    agentId,
  };
  state.logs = [entry, ...state.logs].slice(0, MAX_LOGS);
}

function recomputeMetrics(state: SimState): void {
  const agents = Object.values(state.agents);
  const n = agents.length || 1;
  const avgSkill = agents.reduce((s, a) => s + a.skill, 0) / n;
  const healthy = agents.filter((a) => a.status !== 'failed' && a.status !== 'recovering').length;
  const window = state.recentCompletions.slice(-10);
  const throughput = window.reduce((a, b) => a + b, 0);

  state.metrics = {
    ...state.metrics,
    avgSkill: Math.round(avgSkill * 1000) / 1000,
    uptime: Math.round((healthy / n) * 1000) / 1000,
    throughput,
  };
}

/** Create a fresh simulation with optional seed agents */
export function createSim(options?: {
  seed?: number;
  agents?: CreateAgentInput[];
  connections?: Connection[];
  resources?: Partial<Resources>;
}): SimState {
  const seed = options?.seed ?? 42;
  const state: SimState = {
    tick: 0,
    agents: {},
    tasks: {},
    resources: { ...defaultResources(), ...options?.resources },
    messages: [],
    connections: options?.connections ? [...options.connections] : [],
    logs: [],
    metrics: emptyMetrics(),
    pendingEvents: [],
    recentCompletions: [],
    seed,
    rngState: seed,
  };

  pushLog(state, 'system', 'Simulation initialized');

  if (options?.agents?.length) {
    for (const input of options.agents) {
      addAgent(state, input);
    }
  }

  recomputeMetrics(state);
  return state;
}

export function createDefaultCollective(seed = 7): SimState {
  const roles: AgentRole[] = [...ALL_ROLES];
  const agents: CreateAgentInput[] = roles.map((role, i) => ({
    name: `${role}-01`,
    role,
    skill: 0.45 + i * 0.05,
    position: {
      x: 120 + (i % 3) * 220,
      y: 80 + Math.floor(i / 3) * 180,
    },
  }));

  const state = createSim({ seed, agents });
  const ids = Object.keys(state.agents);
  // Ring + a few cross links so messages flow
  for (let i = 0; i < ids.length; i++) {
    const next = ids[(i + 1) % ids.length];
    addConnection(state, ids[i], next);
  }
  if (ids.length >= 4) {
    addConnection(state, ids[0], ids[3]);
    addConnection(state, ids[1], ids[4 % ids.length]);
  }
  pushLog(state, 'system', 'Default collective loaded (6 roles)');
  return state;
}

export function addAgent(state: SimState, input: CreateAgentInput): Agent {
  const r = nextSeed(state.rngState);
  state.rngState = r.state;
  const id = uid('agent', r.value);
  const count = Object.keys(state.agents).length;
  const agent: Agent = {
    id,
    name: input.name.trim() || `Agent-${count + 1}`,
    role: input.role,
    skill: clamp(input.skill ?? 0.5, 0.05, 0.99),
    energy: 100,
    status: 'idle',
    currentTaskId: null,
    recoveryTicks: 0,
    successCount: 0,
    failCount: 0,
    tasksCompleted: 0,
    tempBoost: 0,
    position: input.position ?? {
      x: 80 + (count % 4) * 200,
      y: 60 + Math.floor(count / 4) * 160,
    },
  };
  state.agents[id] = agent;
  pushLog(state, 'info', `Agent "${agent.name}" (${agent.role}) joined the collective`, id);
  recomputeMetrics(state);
  return agent;
}

export function updateAgent(
  state: SimState,
  agentId: string,
  patch: Partial<Pick<Agent, 'name' | 'role' | 'skill' | 'position'>>,
): void {
  const agent = state.agents[agentId];
  if (!agent) return;
  if (patch.name !== undefined) agent.name = patch.name.trim() || agent.name;
  if (patch.role !== undefined) agent.role = patch.role;
  if (patch.skill !== undefined) agent.skill = clamp(patch.skill, 0.05, 0.99);
  if (patch.position !== undefined) agent.position = { ...patch.position };
  pushLog(state, 'info', `Agent "${agent.name}" reconfigured`, agentId);
}

export function removeAgent(state: SimState, agentId: string): void {
  const agent = state.agents[agentId];
  if (!agent) return;
  if (agent.currentTaskId && state.tasks[agent.currentTaskId]) {
    const t = state.tasks[agent.currentTaskId];
    t.status = 'pending';
    t.assignedTo = null;
    t.progress = 0;
  }
  delete state.agents[agentId];
  state.connections = state.connections.filter(
    (c) => c.source !== agentId && c.target !== agentId,
  );
  pushLog(state, 'warn', `Agent "${agent.name}" removed`, agentId);
  recomputeMetrics(state);
}

export function addConnection(state: SimState, source: string, target: string): Connection | null {
  if (source === target) return null;
  if (!state.agents[source] || !state.agents[target]) return null;
  const exists = state.connections.some(
    (c) =>
      (c.source === source && c.target === target) ||
      (c.source === target && c.target === source),
  );
  if (exists) return null;
  const r = nextSeed(state.rngState);
  state.rngState = r.state;
  const conn: Connection = {
    id: uid('edge', r.value),
    source,
    target,
  };
  state.connections.push(conn);
  pushLog(
    state,
    'info',
    `Linked ${state.agents[source].name} ↔ ${state.agents[target].name}`,
  );
  return conn;
}

export function removeConnection(state: SimState, connectionId: string): void {
  const before = state.connections.length;
  state.connections = state.connections.filter((c) => c.id !== connectionId);
  if (state.connections.length < before) {
    pushLog(state, 'info', 'Connection removed');
  }
}

export function injectEvent(state: SimState, event: Omit<ExternalEvent, 'id' | 'tick'>): void {
  const r = nextSeed(state.rngState);
  state.rngState = r.state;
  state.pendingEvents.push({
    ...event,
    id: uid('evt', r.value),
    tick: state.tick,
  });
  pushLog(state, 'system', `Queued external event: ${event.type}`);
}

function applyPendingEvents(state: SimState): void {
  const events = state.pendingEvents.splice(0, state.pendingEvents.length);
  for (const event of events) {
    applyEvent(state, event);
  }
}

function applyEvent(state: SimState, event: ExternalEvent): void {
  const mag = event.magnitude ?? 0.35;
  switch (event.type) {
    case 'resource_shortage': {
      state.resources.compute = clamp(state.resources.compute * (1 - mag), 0, 100);
      state.resources.energy = clamp(state.resources.energy * (1 - mag), 0, 100);
      pushLog(
        state,
        'error',
        `Resource shortage! Compute→${state.resources.compute.toFixed(0)} Energy→${state.resources.energy.toFixed(0)}`,
      );
      break;
    }
    case 'market_change': {
      // Positive mag = boom (higher demand + budget), negative handled via magnitude sign
      const delta = mag;
      state.resources.marketDemand = clamp(state.resources.marketDemand + delta, 0.2, 3);
      state.resources.budget = clamp(state.resources.budget + delta * 40, 0, 200);
      pushLog(
        state,
        'warn',
        `Market shift: demand×${state.resources.marketDemand.toFixed(2)}, budget ${state.resources.budget.toFixed(0)}`,
      );
      break;
    }
    case 'agent_failure': {
      const agents = Object.values(state.agents);
      let target = event.targetAgentId ? state.agents[event.targetAgentId] : undefined;
      if (!target && agents.length) {
        const r = nextSeed(state.rngState);
        state.rngState = r.state;
        target = pick(agents, r.value);
      }
      if (target && target.status !== 'failed') {
        failAgent(state, target, 'External failure injected');
      }
      break;
    }
  }
}

function failAgent(state: SimState, agent: Agent, reason: string): void {
  if (agent.currentTaskId && state.tasks[agent.currentTaskId]) {
    const task = state.tasks[agent.currentTaskId];
    task.status = 'failed';
    task.assignedTo = null;
    state.metrics.tasksFailed += 1;
  }
  agent.currentTaskId = null;
  agent.status = 'failed';
  agent.recoveryTicks = RECOVERY_TICKS;
  agent.failCount += 1;
  agent.energy = Math.max(5, agent.energy * 0.3);
  state.metrics.totalFailures += 1;
  pushLog(state, 'error', `${agent.name} failed: ${reason}`, agent.id);
}

function neighbors(state: SimState, agentId: string): string[] {
  const ids: string[] = [];
  for (const c of state.connections) {
    if (c.source === agentId) ids.push(c.target);
    else if (c.target === agentId) ids.push(c.source);
  }
  return ids;
}

function sendMessage(
  state: SimState,
  from: string,
  to: string,
  type: Message['type'],
  payload: string,
): void {
  const r = nextSeed(state.rngState);
  state.rngState = r.state;
  const msg: Message = {
    id: uid('msg', r.value),
    from,
    to,
    type,
    payload,
    tick: state.tick,
  };
  state.messages = [msg, ...state.messages].slice(0, MAX_MESSAGES);
  state.metrics.messagesSent += 1;

  const recipient = state.agents[to];
  if (!recipient) return;

  // Apply message effects
  if (type === 'boost') {
    recipient.tempBoost = Math.min(0.25, recipient.tempBoost + 0.08);
    pushLog(state, 'success', `${state.agents[from]?.name} boosted ${recipient.name}`, to);
  } else if (type === 'alert' && recipient.role === 'Monitor') {
    // Monitors react faster — slightly lower recovery for others later
    recipient.tempBoost = Math.min(0.2, recipient.tempBoost + 0.05);
  } else if (type === 'critique') {
    recipient.tempBoost = Math.min(0.15, recipient.tempBoost + 0.04);
  } else if (type === 'help_request') {
    // Idle helpers may switch to assist via skill bump when they take tasks
    if (recipient.status === 'idle') {
      recipient.status = 'communicating';
    }
  }

  if (type !== 'boost') {
    pushLog(
      state,
      'info',
      `${state.agents[from]?.name} → ${recipient.name}: ${type}`,
      from,
    );
  }
}

function maybeSpawnTask(state: SimState): void {
  const pending = Object.values(state.tasks).filter(
    (t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress',
  ).length;
  if (pending >= 12) return;

  const r1 = nextSeed(state.rngState);
  state.rngState = r1.state;
  const spawnChance = TASK_SPAWN_BASE * state.resources.marketDemand;
  if (r1.value > spawnChance) return;

  const r2 = nextSeed(state.rngState);
  state.rngState = r2.state;
  const types: TaskType[] = ['code', 'research', 'trade', 'monitor', 'create', 'review'];
  const type = pick(types, r2.value);

  const r3 = nextSeed(state.rngState);
  state.rngState = r3.state;
  const title = pick(TASK_TITLES[type], r3.value);

  const r4 = nextSeed(state.rngState);
  state.rngState = r4.state;
  const difficulty = 0.25 + r4.value * 0.65;

  const r5 = nextSeed(state.rngState);
  state.rngState = r5.state;
  const task: Task = {
    id: uid('task', r5.value),
    type,
    title,
    difficulty,
    progress: 0,
    status: 'pending',
    assignedTo: null,
    reward: Math.round(10 + difficulty * 30),
    createdTick: state.tick,
  };
  state.tasks[task.id] = task;
  pushLog(state, 'info', `New task: ${task.title} (${task.type})`);
}

function claimTask(state: SimState, agent: Agent): void {
  const preferred = ROLE_TASK_MAP[agent.role];
  const pending = Object.values(state.tasks).filter((t) => t.status === 'pending');
  // Prefer role-matched tasks; fall back to any
  let task =
    pending.find((t) => t.type === preferred) ??
    (agent.role === 'Monitor' || agent.role === 'Critic'
      ? pending[0]
      : pending.find((t) => t.type === preferred));

  // Monitors / Critics can pick unmatched if nothing preferred
  if (!task && pending.length && (agent.role === 'Monitor' || agent.role === 'Critic' || agent.role === 'Creative')) {
    task = pending[0];
  }
  // Coders etc only take preferred type when available
  if (!task) {
    task = pending.find((t) => t.type === preferred);
  }
  if (!task) return;

  task.status = 'assigned';
  task.assignedTo = agent.id;
  agent.currentTaskId = task.id;
  agent.status = 'working';
  pushLog(state, 'info', `${agent.name} claimed "${task.title}"`, agent.id);
}

function workOnTask(state: SimState, agent: Agent): void {
  const task = agent.currentTaskId ? state.tasks[agent.currentTaskId] : null;
  if (!task) {
    agent.status = 'idle';
    agent.currentTaskId = null;
    return;
  }

  task.status = 'in_progress';

  // Resource pressure slows work
  const computeFactor = 0.4 + (state.resources.compute / 100) * 0.6;
  const energyFactor = 0.4 + (state.resources.energy / 100) * 0.6;
  const effectiveSkill = clamp(agent.skill + agent.tempBoost, 0.05, 0.99);
  const progressGain =
    (8 + effectiveSkill * 18) * computeFactor * energyFactor * (1.15 - task.difficulty * 0.4);

  task.progress = Math.min(100, task.progress + progressGain);
  agent.energy = Math.max(0, agent.energy - (4 + task.difficulty * 6));
  state.resources.compute = Math.max(0, state.resources.compute - 0.8);
  state.resources.energy = Math.max(0, state.resources.energy - 0.6);

  // Failure chance while working
  const r = nextSeed(state.rngState);
  state.rngState = r.state;
  const failChance =
    0.02 +
    task.difficulty * 0.06 +
    (agent.energy < 15 ? 0.08 : 0) +
    (state.resources.compute < 20 ? 0.05 : 0) -
    effectiveSkill * 0.04;

  if (r.value < failChance) {
    failAgent(state, agent, `Task "${task.title}" blew up`);
    return;
  }

  if (agent.energy <= 0) {
    failAgent(state, agent, 'Energy depleted');
    return;
  }

  if (task.progress >= 100) {
    completeTask(state, agent, task);
  }
}

function completeTask(state: SimState, agent: Agent, task: Task): void {
  task.status = 'completed';
  task.progress = 100;
  task.assignedTo = null;
  agent.currentTaskId = null;
  agent.status = 'idle';
  agent.successCount += 1;
  agent.tasksCompleted += 1;
  agent.skill = clamp(agent.skill + 0.015 + task.difficulty * 0.01, 0.05, 0.99);
  state.metrics.tasksCompleted += 1;
  state.resources.budget = clamp(state.resources.budget + task.reward * 0.5, 0, 200);
  // Small resource recovery on success
  state.resources.compute = clamp(state.resources.compute + 2, 0, 100);

  // Communicate completion along edges
  const nbs = neighbors(state, agent.id);
  if (nbs.length) {
    const r = nextSeed(state.rngState);
    state.rngState = r.state;
    const to = pick(nbs, r.value);
    let msgType: Message['type'] = 'status';
    if (agent.role === 'Creative') msgType = 'boost';
    else if (agent.role === 'Critic') msgType = 'critique';
    else if (agent.role === 'Monitor') msgType = 'alert';
    else if (task.difficulty > 0.7) msgType = 'handoff';
    sendMessage(state, agent.id, to, msgType, `Completed ${task.title}`);
  }

  pushLog(state, 'success', `${agent.name} completed "${task.title}" (skill ${(agent.skill * 100).toFixed(0)}%)`, agent.id);
}

function processAgent(state: SimState, agent: Agent): void {
  // Decay temp boost
  if (agent.tempBoost > 0) {
    agent.tempBoost = Math.max(0, agent.tempBoost - 0.01);
  }

  if (agent.status === 'failed') {
    agent.recoveryTicks -= 1;
    if (agent.recoveryTicks <= 0) {
      agent.status = 'recovering';
      agent.recoveryTicks = 3;
      pushLog(state, 'warn', `${agent.name} entering recovery`, agent.id);
    }
    return;
  }

  if (agent.status === 'recovering') {
    agent.energy = Math.min(100, agent.energy + 12);
    agent.recoveryTicks -= 1;
    // Monitors accelerate collective recovery via alerts
    if (agent.role === 'Monitor') {
      for (const other of Object.values(state.agents)) {
        if (other.id !== agent.id && other.status === 'recovering') {
          other.energy = Math.min(100, other.energy + 4);
        }
      }
    }
    if (agent.recoveryTicks <= 0 && agent.energy >= 40) {
      agent.status = 'idle';
      state.metrics.totalRecoveries += 1;
      pushLog(state, 'success', `${agent.name} recovered and is online`, agent.id);
    }
    return;
  }

  // Passive energy restore when idle
  if (agent.status === 'idle' || agent.status === 'communicating') {
    agent.energy = Math.min(100, agent.energy + 3);
    agent.status = 'idle';
  }

  // Traders gently improve budget
  if (agent.role === 'Trader' && agent.status === 'idle') {
    const r = nextSeed(state.rngState);
    state.rngState = r.state;
    if (r.value < 0.3) {
      const gain = (0.5 + agent.skill) * state.resources.marketDemand;
      state.resources.budget = clamp(state.resources.budget + gain, 0, 200);
    }
  }

  // Work or claim
  if (agent.currentTaskId) {
    workOnTask(state, agent);
  } else if (agent.energy > 25 && state.resources.compute > 5) {
    claimTask(state, agent);
  }

  // Occasional help request when struggling
  if (agent.status === 'working' && agent.energy < 30) {
    const nbs = neighbors(state, agent.id);
    if (nbs.length) {
      const r = nextSeed(state.rngState);
      state.rngState = r.state;
      if (r.value < 0.2) {
        sendMessage(state, agent.id, pick(nbs, r.value), 'help_request', 'Need support');
      }
    }
  }
}

function regenerateResources(state: SimState): void {
  // Slow natural regen unless shortage-crushed
  state.resources.compute = clamp(state.resources.compute + 1.2, 0, 100);
  state.resources.energy = clamp(state.resources.energy + 1.0, 0, 100);
  // Market demand mean-reverts slowly
  state.resources.marketDemand += (1 - state.resources.marketDemand) * 0.02;
  state.resources.marketDemand = clamp(state.resources.marketDemand, 0.2, 3);
}

/** Advance simulation by one tick. Mutates and returns the same state object. */
export function tick(state: SimState): SimState {
  state.tick += 1;
  const completionsBefore = state.metrics.tasksCompleted;

  applyPendingEvents(state);
  maybeSpawnTask(state);

  // Stable order by id for determinism
  const agents = Object.values(state.agents).sort((a, b) => a.id.localeCompare(b.id));
  for (const agent of agents) {
    processAgent(state, agent);
  }

  regenerateResources(state);

  const completedThisTick = state.metrics.tasksCompleted - completionsBefore;
  state.recentCompletions.push(completedThisTick);
  if (state.recentCompletions.length > 50) {
    state.recentCompletions = state.recentCompletions.slice(-50);
  }

  recomputeMetrics(state);
  return state;
}

export function tickMany(state: SimState, n: number): SimState {
  for (let i = 0; i < n; i++) tick(state);
  return state;
}

/** Deep-ish clone of sim state for snapshots */
export function cloneState(state: SimState): SimState {
  return {
    tick: state.tick,
    agents: Object.fromEntries(
      Object.entries(state.agents).map(([k, a]) => [k, { ...a, position: { ...a.position } }]),
    ),
    tasks: Object.fromEntries(Object.entries(state.tasks).map(([k, t]) => [k, { ...t }])),
    resources: { ...state.resources },
    messages: state.messages.map((m) => ({ ...m })),
    connections: state.connections.map((c) => ({ ...c })),
    logs: state.logs.map((l) => ({ ...l })),
    metrics: { ...state.metrics },
    pendingEvents: state.pendingEvents.map((e) => ({ ...e })),
    recentCompletions: [...state.recentCompletions],
    seed: state.seed,
    rngState: state.rngState,
  };
}

export function serializeScenario(state: SimState, name: string): ScenarioConfig {
  return {
    version: 1,
    name,
    agents: Object.values(state.agents).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      skill: a.skill,
      position: { ...a.position },
    })),
    connections: state.connections.map((c) => ({ ...c })),
    resources: { ...state.resources },
    savedAt: new Date().toISOString(),
  };
}

export function loadScenario(scenario: ScenarioConfig, seed = 99): SimState {
  const state = createSim({
    seed,
    resources: scenario.resources,
  });
  // Clear default log noise somewhat — keep init
  const idMap = new Map<string, string>();

  for (const a of scenario.agents) {
    const created = addAgent(state, {
      name: a.name,
      role: a.role,
      skill: a.skill,
      position: a.position,
    });
    idMap.set(a.id, created.id);
  }

  for (const c of scenario.connections) {
    const source = idMap.get(c.source) ?? c.source;
    const target = idMap.get(c.target) ?? c.target;
    addConnection(state, source, target);
  }

  pushLog(state, 'system', `Scenario "${scenario.name}" loaded`);
  recomputeMetrics(state);
  return state;
}

export function getAgentStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'idle':
      return '#64748b';
    case 'working':
      return '#22c55e';
    case 'communicating':
      return '#38bdf8';
    case 'failed':
      return '#ef4444';
    case 'recovering':
      return '#f59e0b';
    default:
      return '#94a3b8';
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export { ALL_ROLES, ROLE_TASK_MAP };
