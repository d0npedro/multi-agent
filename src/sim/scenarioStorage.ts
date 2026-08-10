import type { ScenarioConfig } from './types';

const STORAGE_KEY = 'multi-agent-scenarios';
const LAST_KEY = 'multi-agent-last-scenario';

export function listScenarios(): ScenarioConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScenarioConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScenarioToStorage(scenario: ScenarioConfig): void {
  const list = listScenarios().filter((s) => s.name !== scenario.name);
  list.unshift(scenario);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  localStorage.setItem(LAST_KEY, JSON.stringify(scenario));
}

export function loadScenarioFromStorage(name: string): ScenarioConfig | null {
  return listScenarios().find((s) => s.name === name) ?? null;
}

export function deleteScenarioFromStorage(name: string): void {
  const list = listScenarios().filter((s) => s.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getLastScenario(): ScenarioConfig | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScenarioConfig;
  } catch {
    return null;
  }
}

/** Pure round-trip helper for tests (no localStorage) */
export function roundTripScenario(scenario: ScenarioConfig): ScenarioConfig {
  return JSON.parse(JSON.stringify(scenario)) as ScenarioConfig;
}
