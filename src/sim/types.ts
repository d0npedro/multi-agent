/** Core types for the multi-agent collective simulator */

export type AgentRole =
  | 'Coder'
  | 'Researcher'
  | 'Trader'
  | 'Monitor'
  | 'Creative'
  | 'Critic';

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'communicating'
  | 'failed'
  | 'recovering';

export type TaskType =
  | 'code'
  | 'research'
  | 'trade'
  | 'monitor'
  | 'create'
  | 'review';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';

export type MessageType =
  | 'help_request'
  | 'handoff'
  | 'status'
  | 'alert'
  | 'boost'
  | 'critique';

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'system';

export type ExternalEventType =
  | 'resource_shortage'
  | 'market_change'
  | 'agent_failure';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  /** 0–1 skill level; improves on success */
  skill: number;
  /** 0–100 energy; consumed by work, restored when idle/recovering */
  energy: number;
  status: AgentStatus;
  currentTaskId: string | null;
  /** Remaining ticks while recovering */
  recoveryTicks: number;
  successCount: number;
  failCount: number;
  /** Cumulative tasks completed (for metrics) */
  tasksCompleted: number;
  /** Temporary skill boost from messages (decays) */
  tempBoost: number;
  /** Position for graph UI */
  position: { x: number; y: number };
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  difficulty: number; // 0.1–1
  progress: number; // 0–100
  status: TaskStatus;
  assignedTo: string | null;
  reward: number;
  createdTick: number;
}

export interface Resources {
  /** Shared compute capacity 0–100 */
  compute: number;
  /** Shared energy pool 0–100 */
  energy: number;
  /** Budget / market capital 0–200 */
  budget: number;
  /** Market demand multiplier affecting task spawn rate */
  marketDemand: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: string;
  tick: number;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
}

export interface LogEntry {
  id: string;
  tick: number;
  level: LogLevel;
  message: string;
  agentId?: string;
}

export interface ExternalEvent {
  id: string;
  type: ExternalEventType;
  /** Optional agent id for agent_failure */
  targetAgentId?: string;
  magnitude?: number;
  tick?: number;
}

export interface Metrics {
  tasksCompleted: number;
  tasksFailed: number;
  messagesSent: number;
  totalFailures: number;
  totalRecoveries: number;
  avgSkill: number;
  throughput: number; // completed per 10 ticks
  uptime: number; // fraction of non-failed agents
}

export interface SimState {
  tick: number;
  agents: Record<string, Agent>;
  tasks: Record<string, Task>;
  resources: Resources;
  messages: Message[];
  connections: Connection[];
  logs: LogEntry[];
  metrics: Metrics;
  /** Pending external events applied at start of next tick */
  pendingEvents: ExternalEvent[];
  /** Rolling completions for throughput */
  recentCompletions: number[];
  seed: number;
  rngState: number;
}

export interface ScenarioConfig {
  version: 1;
  name: string;
  agents: Array<{
    id: string;
    name: string;
    role: AgentRole;
    skill?: number;
    position: { x: number; y: number };
  }>;
  connections: Connection[];
  resources?: Partial<Resources>;
  savedAt: string;
}

export interface CreateAgentInput {
  name: string;
  role: AgentRole;
  skill?: number;
  position?: { x: number; y: number };
}

export const ROLE_TASK_MAP: Record<AgentRole, TaskType> = {
  Coder: 'code',
  Researcher: 'research',
  Trader: 'trade',
  Monitor: 'monitor',
  Creative: 'create',
  Critic: 'review',
};

export const TASK_TITLES: Record<TaskType, string[]> = {
  code: ['Implement API endpoint', 'Fix race condition', 'Refactor module', 'Write unit tests'],
  research: ['Scan literature', 'Gather market data', 'Analyze logs', 'Benchmark options'],
  trade: ['Rebalance portfolio', 'Execute hedge', 'Optimize spend', 'Arbitrage scan'],
  monitor: ['Health check cluster', 'Watch error budget', 'Audit latency', 'Detect anomaly'],
  create: ['Draft proposal', 'Design UX flow', 'Brainstorm features', 'Sketch architecture'],
  review: ['Code review PR', 'Critique design', 'QA acceptance', 'Risk assessment'],
};

export const ALL_ROLES: AgentRole[] = [
  'Coder',
  'Researcher',
  'Trader',
  'Monitor',
  'Creative',
  'Critic',
];
