import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ExternalEventType } from '../sim';

function ResourceBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="resource-bar">
      <div className="resource-bar-header">
        <span>{label}</span>
        <span>
          {value.toFixed(0)} / {max}
        </span>
      </div>
      <div className="bar-track tall">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function MetricsPanel() {
  const metrics = useAppStore((s) => s.snapshot.metrics);
  const tasks = useAppStore((s) => s.snapshot.tasks);
  const activeTasks = Object.values(tasks).filter(
    (t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress',
  ).length;

  return (
    <div className="panel metrics-panel" data-testid="metrics-panel">
      <h2>Performance</h2>
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-value">{metrics.tasksCompleted}</span>
          <span className="metric-label">Completed</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{metrics.tasksFailed}</span>
          <span className="metric-label">Task fails</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{metrics.messagesSent}</span>
          <span className="metric-label">Messages</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{metrics.throughput}</span>
          <span className="metric-label">Throughput /10t</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{(metrics.avgSkill * 100).toFixed(0)}%</span>
          <span className="metric-label">Avg skill</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{(metrics.uptime * 100).toFixed(0)}%</span>
          <span className="metric-label">Uptime</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{metrics.totalFailures}</span>
          <span className="metric-label">Failures</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{metrics.totalRecoveries}</span>
          <span className="metric-label">Recoveries</span>
        </div>
      </div>
      <p className="muted active-tasks">Open tasks: {activeTasks}</p>
    </div>
  );
}

export function ResourcePanel() {
  const resources = useAppStore((s) => s.snapshot.resources);
  return (
    <div className="panel resource-panel" data-testid="resource-panel">
      <h2>Resources</h2>
      <ResourceBar label="Compute" value={resources.compute} max={100} color="#38bdf8" />
      <ResourceBar label="Energy" value={resources.energy} max={100} color="#a78bfa" />
      <ResourceBar label="Budget" value={resources.budget} max={200} color="#34d399" />
      <div className="market-line">
        Market demand <strong>×{resources.marketDemand.toFixed(2)}</strong>
      </div>
    </div>
  );
}

export function LogPanel() {
  const logs = useAppStore((s) => s.snapshot.logs);
  return (
    <div className="panel log-panel" data-testid="log-panel">
      <h2>Live log</h2>
      <div className="log-stream">
        {logs.slice(0, 80).map((entry) => (
          <div key={entry.id} className={`log-line log-${entry.level}`}>
            <span className="log-tick">t{entry.tick}</span>
            <span className="log-msg">{entry.message}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="muted">No events yet.</div>}
      </div>
    </div>
  );
}

export function EventPanel() {
  const triggerEvent = useAppStore((s) => s.triggerEvent);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const agents = useAppStore((s) => s.snapshot.agents);

  const fire = (type: ExternalEventType) => {
    if (type === 'agent_failure') {
      triggerEvent(type, selectedAgentId ?? undefined);
    } else {
      triggerEvent(type);
    }
  };

  return (
    <div className="panel event-panel" data-testid="event-panel">
      <h2>External events</h2>
      <p className="hint">Inject chaos and watch the collective react.</p>
      <div className="btn-stack">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => fire('resource_shortage')}
          data-testid="evt-shortage"
        >
          ⚡ Resource shortage
        </button>
        <button
          type="button"
          className="btn btn-warn"
          onClick={() => fire('market_change')}
          data-testid="evt-market"
        >
          📊 Market change
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => fire('agent_failure')}
          data-testid="evt-failure"
        >
          💥 Agent failure
          {selectedAgentId && agents[selectedAgentId]
            ? ` (${agents[selectedAgentId].name})`
            : ' (random)'}
        </button>
      </div>
    </div>
  );
}

function useScenarioNameField() {
  const scenarioName = useAppStore((s) => s.scenarioName);
  const [name, setName] = useState(scenarioName);
  useEffect(() => {
    setName(scenarioName);
  }, [scenarioName]);
  return [name, setName] as const;
}

export function SaveLoadPanel() {
  const savedNames = useAppStore((s) => s.savedNames);
  const saveScenario = useAppStore((s) => s.saveScenario);
  const loadScenarioByName = useAppStore((s) => s.loadScenarioByName);
  const removeSavedScenario = useAppStore((s) => s.removeSavedScenario);
  const [name, setName] = useScenarioNameField();

  return (
    <div className="panel save-panel" data-testid="save-load-panel">
      <h2>Scenarios</h2>
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="scenario-name"
        />
      </label>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => saveScenario(name)}
        data-testid="btn-save-scenario"
      >
        💾 Save setup
      </button>
      <h3>Saved</h3>
      <ul className="scenario-list" data-testid="scenario-list">
        {savedNames.length === 0 && <li className="muted">No saved scenarios yet</li>}
        {savedNames.map((n) => (
          <li key={n} className="scenario-item">
            <button type="button" className="btn btn-sm" onClick={() => loadScenarioByName(n)}>
              Load
            </button>
            <span>{n}</span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => removeSavedScenario(n)}
              aria-label={`Delete ${n}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TaskPanel() {
  const tasks = useAppStore((s) => s.snapshot.tasks);
  const list = Object.values(tasks)
    .sort((a, b) => b.createdTick - a.createdTick)
    .slice(0, 12);

  return (
    <div className="panel task-panel" data-testid="task-panel">
      <h2>Task board</h2>
      <ul className="task-list">
        {list.length === 0 && <li className="muted">No tasks yet — press Play</li>}
        {list.map((t) => (
          <li key={t.id} className={`task-item status-${t.status}`}>
            <div className="task-title">{t.title}</div>
            <div className="task-meta">
              <span>{t.type}</span>
              <span>{t.status}</span>
              <span>{t.progress.toFixed(0)}%</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${t.progress}%`,
                  background: t.status === 'failed' ? '#ef4444' : '#22c55e',
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
