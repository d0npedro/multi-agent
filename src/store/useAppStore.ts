import { create } from 'zustand';
import {
  type AgentRole,
  type ExternalEventType,
  type ScenarioConfig,
  type SimState,
  createDefaultCollective,
  createSim,
  tick,
  cloneState,
  addAgent,
  updateAgent,
  removeAgent,
  addConnection,
  removeConnection,
  injectEvent,
  serializeScenario,
  loadScenario,
} from '../sim';
import {
  saveScenarioToStorage,
  loadScenarioFromStorage,
  listScenarios,
  deleteScenarioFromStorage,
} from '../sim/scenarioStorage';

export type SimSpeed = 1 | 2 | 4 | 8;

interface AppState {
  sim: SimState;
  snapshot: SimState;
  running: boolean;
  speed: SimSpeed;
  selectedAgentId: string | null;
  scenarioName: string;
  savedNames: string[];

  // Controls
  play: () => void;
  pause: () => void;
  setSpeed: (s: SimSpeed) => void;
  step: () => void;
  resetDefault: () => void;
  resetEmpty: () => void;

  // Agents / graph
  selectAgent: (id: string | null) => void;
  createAgent: (name: string, role: AgentRole, skill?: number) => void;
  configureAgent: (
    id: string,
    patch: { name?: string; role?: AgentRole; skill?: number; position?: { x: number; y: number } },
  ) => void;
  deleteAgent: (id: string) => void;
  connectAgents: (source: string, target: string) => void;
  disconnect: (connectionId: string) => void;
  updateAgentPosition: (id: string, position: { x: number; y: number }) => void;

  // Events
  triggerEvent: (type: ExternalEventType, targetAgentId?: string) => void;

  // Persistence
  saveScenario: (name?: string) => void;
  loadScenarioByName: (name: string) => void;
  refreshSavedNames: () => void;
  removeSavedScenario: (name: string) => void;

  // Internal
  _applyTick: () => void;
  _sync: () => void;
}

function publish(sim: SimState): Pick<AppState, 'sim' | 'snapshot'> {
  return { sim, snapshot: cloneState(sim) };
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = createDefaultCollective(7);
  return {
    sim: initial,
    snapshot: cloneState(initial),
    running: false,
    speed: 1,
    selectedAgentId: null,
    scenarioName: 'Default Collective',
    savedNames: typeof localStorage !== 'undefined' ? listScenarios().map((s) => s.name) : [],

    play: () => set({ running: true }),
    pause: () => set({ running: false }),
    setSpeed: (speed) => set({ speed }),
    step: () => {
      const { sim } = get();
      tick(sim);
      set(publish(sim));
    },
    resetDefault: () => {
      const sim = createDefaultCollective(Date.now() % 100000);
      set({
        ...publish(sim),
        running: false,
        selectedAgentId: null,
        scenarioName: 'Default Collective',
      });
    },
    resetEmpty: () => {
      const sim = createSim({ seed: Date.now() % 100000 });
      set({
        ...publish(sim),
        running: false,
        selectedAgentId: null,
        scenarioName: 'Empty',
      });
    },

    selectAgent: (id) => set({ selectedAgentId: id }),

    createAgent: (name, role, skill) => {
      const { sim } = get();
      addAgent(sim, { name, role, skill });
      set(publish(sim));
    },

    configureAgent: (id, patch) => {
      const { sim } = get();
      updateAgent(sim, id, patch);
      set(publish(sim));
    },

    deleteAgent: (id) => {
      const { sim, selectedAgentId } = get();
      removeAgent(sim, id);
      set({
        ...publish(sim),
        selectedAgentId: selectedAgentId === id ? null : selectedAgentId,
      });
    },

    connectAgents: (source, target) => {
      const { sim } = get();
      addConnection(sim, source, target);
      set(publish(sim));
    },

    disconnect: (connectionId) => {
      const { sim } = get();
      removeConnection(sim, connectionId);
      set(publish(sim));
    },

    updateAgentPosition: (id, position) => {
      const { sim } = get();
      if (sim.agents[id]) {
        sim.agents[id].position = position;
        // Don't spam logs for drag — updateAgent would log
        set(publish(sim));
      }
    },

    triggerEvent: (type, targetAgentId) => {
      const { sim } = get();
      injectEvent(sim, { type, targetAgentId, magnitude: type === 'market_change' ? 0.4 : 0.35 });
      set(publish(sim));
    },

    saveScenario: (name) => {
      const { sim, scenarioName } = get();
      const n = (name ?? scenarioName).trim() || 'Untitled';
      const scenario: ScenarioConfig = serializeScenario(sim, n);
      saveScenarioToStorage(scenario);
      set({
        scenarioName: n,
        savedNames: listScenarios().map((s) => s.name),
      });
    },

    loadScenarioByName: (name) => {
      const scenario = loadScenarioFromStorage(name);
      if (!scenario) return;
      const sim = loadScenario(scenario);
      set({
        ...publish(sim),
        running: false,
        selectedAgentId: null,
        scenarioName: scenario.name,
      });
    },

    refreshSavedNames: () => {
      set({ savedNames: listScenarios().map((s) => s.name) });
    },

    removeSavedScenario: (name) => {
      deleteScenarioFromStorage(name);
      set({ savedNames: listScenarios().map((s) => s.name) });
    },

    _applyTick: () => {
      const { sim, running } = get();
      if (!running) return;
      tick(sim);
      set(publish(sim));
    },

    _sync: () => {
      const { sim } = get();
      set(publish(sim));
    },
  };
});
