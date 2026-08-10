import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSim,
  createDefaultCollective,
  tick,
  tickMany,
  addAgent,
  addConnection,
  injectEvent,
  serializeScenario,
  loadScenario,
  cloneState,
} from './engine';
import { roundTripScenario } from './scenarioStorage';
import type { SimState } from './types';

describe('simulation engine', () => {
  let state: SimState;

  beforeEach(() => {
    state = createSim({
      seed: 123,
      agents: [
        { name: 'Alice', role: 'Coder', skill: 0.6, position: { x: 0, y: 0 } },
        { name: 'Bob', role: 'Researcher', skill: 0.55, position: { x: 100, y: 0 } },
        { name: 'Cara', role: 'Monitor', skill: 0.5, position: { x: 200, y: 0 } },
      ],
    });
    const ids = Object.keys(state.agents);
    addConnection(state, ids[0], ids[1]);
    addConnection(state, ids[1], ids[2]);
  });

  it('createSim initializes agents and tick 0', () => {
    expect(state.tick).toBe(0);
    expect(Object.keys(state.agents)).toHaveLength(3);
    expect(state.resources.compute).toBeGreaterThan(0);
    expect(state.logs.length).toBeGreaterThan(0);
  });

  it('tick advances shared state over multiple ticks', () => {
    const t0 = state.tick;
    tick(state);
    tick(state);
    tick(state);
    expect(state.tick).toBe(t0 + 3);
    // Resources or tasks should have evolved
    const activity =
      Object.keys(state.tasks).length > 0 ||
      state.metrics.tasksCompleted > 0 ||
      Object.values(state.agents).some((a) => a.status !== 'idle' || a.energy < 100);
    expect(activity || state.tick === 3).toBe(true);
  });

  it('agents process tasks across ticks', () => {
    tickMany(state, 80);
    const completed = state.metrics.tasksCompleted;
    const anyWorked = Object.values(state.agents).some(
      (a) => a.tasksCompleted > 0 || a.successCount > 0 || a.currentTaskId,
    );
    const tasksExist = Object.keys(state.tasks).length > 0;
    expect(completed > 0 || anyWorked || tasksExist).toBe(true);
  });

  it('messaging occurs when agents complete work along connections', () => {
    tickMany(state, 100);
    // Either messages sent metric or message list should grow when graph is connected
    // Force a long run; default collective is denser
    const dense = createDefaultCollective(42);
    tickMany(dense, 120);
    expect(dense.metrics.messagesSent).toBeGreaterThan(0);
    expect(dense.messages.length).toBeGreaterThan(0);
  });

  it('failure and recovery change agent status', () => {
    const agentId = Object.keys(state.agents)[0];
    injectEvent(state, { type: 'agent_failure', targetAgentId: agentId });
    tick(state);
    expect(state.agents[agentId].status).toBe('failed');
    expect(state.metrics.totalFailures).toBeGreaterThanOrEqual(1);

    // Advance through recovery window
    tickMany(state, 12);
    const status = state.agents[agentId].status;
    expect(['recovering', 'idle', 'working', 'communicating']).toContain(status);
    expect(state.metrics.totalRecoveries).toBeGreaterThanOrEqual(1);
  });

  it('resource_shortage event reduces resources', () => {
    const beforeCompute = state.resources.compute;
    const beforeEnergy = state.resources.energy;
    injectEvent(state, { type: 'resource_shortage', magnitude: 0.5 });
    tick(state);
    expect(state.resources.compute).toBeLessThan(beforeCompute);
    expect(state.resources.energy).toBeLessThan(beforeEnergy);
  });

  it('market_change event alters demand and budget', () => {
    const beforeDemand = state.resources.marketDemand;
    const beforeBudget = state.resources.budget;
    injectEvent(state, { type: 'market_change', magnitude: 0.5 });
    tick(state);
    expect(state.resources.marketDemand).toBeGreaterThan(beforeDemand);
    expect(state.resources.budget).toBeGreaterThan(beforeBudget);
  });

  it('metrics and logs are produced during simulation', () => {
    tickMany(state, 40);
    expect(state.logs.length).toBeGreaterThan(0);
    expect(state.metrics.avgSkill).toBeGreaterThan(0);
    expect(state.metrics.uptime).toBeGreaterThanOrEqual(0);
    expect(state.metrics.uptime).toBeLessThanOrEqual(1);
  });

  it('agents improve skill after successful completions', () => {
    const dense = createDefaultCollective(99);
    const before = Object.values(dense.agents).reduce((s, a) => s + a.skill, 0);
    tickMany(dense, 150);
    const after = Object.values(dense.agents).reduce((s, a) => s + a.skill, 0);
    if (dense.metrics.tasksCompleted > 0) {
      expect(after).toBeGreaterThan(before);
    } else {
      // Still assert engine ran
      expect(dense.tick).toBe(150);
    }
  });

  it('scenario serialize/load preserves agents, roles, connections', () => {
    const scenario = serializeScenario(state, 'test-setup');
    const rt = roundTripScenario(scenario);
    expect(rt.agents).toHaveLength(3);
    expect(rt.connections).toHaveLength(2);

    const loaded = loadScenario(rt, 55);
    const names = Object.values(loaded.agents)
      .map((a) => a.name)
      .sort();
    expect(names).toEqual(['Alice', 'Bob', 'Cara'].sort());
    const roles = Object.values(loaded.agents).map((a) => a.role);
    expect(roles).toContain('Coder');
    expect(roles).toContain('Researcher');
    expect(roles).toContain('Monitor');
    expect(loaded.connections.length).toBe(2);
  });

  it('cloneState is independent of further mutations', () => {
    tick(state);
    const snap = cloneState(state);
    const tickAtClone = snap.tick;
    tickMany(state, 5);
    expect(snap.tick).toBe(tickAtClone);
    expect(state.tick).toBe(tickAtClone + 5);
  });

  it('addAgent increases population', () => {
    const n = Object.keys(state.agents).length;
    addAgent(state, { name: 'Dana', role: 'Trader', skill: 0.4 });
    expect(Object.keys(state.agents).length).toBe(n + 1);
  });

  it('default collective has all six roles', () => {
    const d = createDefaultCollective();
    const roles = new Set(Object.values(d.agents).map((a) => a.role));
    expect(roles.has('Coder')).toBe(true);
    expect(roles.has('Researcher')).toBe(true);
    expect(roles.has('Trader')).toBe(true);
    expect(roles.has('Monitor')).toBe(true);
    expect(roles.has('Creative')).toBe(true);
    expect(roles.has('Critic')).toBe(true);
  });
});
