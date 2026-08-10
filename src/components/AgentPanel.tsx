import { useState, useEffect } from 'react';
import { ALL_ROLES, type AgentRole } from '../sim';
import { useAppStore } from '../store/useAppStore';

export function AgentPanel() {
  const snapshot = useAppStore((s) => s.snapshot);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const createAgent = useAppStore((s) => s.createAgent);
  const configureAgent = useAppStore((s) => s.configureAgent);
  const deleteAgent = useAppStore((s) => s.deleteAgent);
  const selectAgent = useAppStore((s) => s.selectAgent);

  const [name, setName] = useState('');
  const [role, setRole] = useState<AgentRole>('Coder');
  const [skill, setSkill] = useState(0.5);

  const selected = selectedAgentId ? snapshot.agents[selectedAgentId] : null;

  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<AgentRole>('Coder');
  const [editSkill, setEditSkill] = useState(0.5);

  useEffect(() => {
    if (selected) {
      setEditName(selected.name);
      setEditRole(selected.role);
      setEditSkill(selected.skill);
    }
  }, [selected?.id, selected?.name, selected?.role, selected?.skill]);

  const onCreate = () => {
    createAgent(name || `${role}-new`, role, skill);
    setName('');
  };

  const onSaveConfig = () => {
    if (!selected) return;
    configureAgent(selected.id, {
      name: editName,
      role: editRole,
      skill: editSkill,
    });
  };

  return (
    <div className="panel agent-panel" data-testid="agent-panel">
      <h2>Agents</h2>

      <section className="panel-section">
        <h3>Create agent</h3>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agent name"
            data-testid="create-agent-name"
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AgentRole)}
            data-testid="create-agent-role"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Skill {(skill * 100).toFixed(0)}%
          <input
            type="range"
            min={0.1}
            max={0.95}
            step={0.05}
            value={skill}
            onChange={(e) => setSkill(Number(e.target.value))}
          />
        </label>
        <button type="button" className="btn btn-primary btn-block" onClick={onCreate} data-testid="btn-create-agent">
          + Create Agent
        </button>
      </section>

      <section className="panel-section">
        <h3>Roster ({Object.keys(snapshot.agents).length})</h3>
        <ul className="agent-list" data-testid="agent-roster">
          {Object.values(snapshot.agents).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={`agent-list-item ${selectedAgentId === a.id ? 'active' : ''}`}
                onClick={() => selectAgent(a.id)}
              >
                <span className={`status-dot status-${a.status}`} />
                <span className="agent-list-name">{a.name}</span>
                <span className="muted">{a.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <section className="panel-section" data-testid="agent-config">
          <h3>Configure</h3>
          <label>
            Name
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </label>
          <label>
            Role
            <select value={editRole} onChange={(e) => setEditRole(e.target.value as AgentRole)}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Skill {(editSkill * 100).toFixed(0)}%
            <input
              type="range"
              min={0.1}
              max={0.95}
              step={0.05}
              value={editSkill}
              onChange={(e) => setEditSkill(Number(e.target.value))}
            />
          </label>
          <div className="config-stats">
            <div>
              Status: <strong className={`text-${selected.status}`}>{selected.status}</strong>
            </div>
            <div>Energy: {selected.energy.toFixed(0)}</div>
            <div>
              Success / Fail: {selected.successCount} / {selected.failCount}
            </div>
            <div>Completed: {selected.tasksCompleted}</div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={onSaveConfig}>
              Apply
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => deleteAgent(selected.id)}
              data-testid="btn-delete-agent"
            >
              Remove
            </button>
          </div>
        </section>
      )}

      <p className="hint">Drag between node handles to connect agents into a workflow graph.</p>
    </div>
  );
}
