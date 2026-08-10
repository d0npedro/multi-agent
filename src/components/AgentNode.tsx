import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentStatus, AgentRole } from '../sim';

export type AgentNodeData = {
  label: string;
  role: AgentRole;
  status: AgentStatus;
  skill: number;
  energy: number;
  tasksCompleted: number;
};

const STATUS_CLASS: Record<AgentStatus, string> = {
  idle: 'status-idle',
  working: 'status-working',
  communicating: 'status-comm',
  failed: 'status-failed',
  recovering: 'status-recovering',
};

const ROLE_ICON: Record<AgentRole, string> = {
  Coder: '</>',
  Researcher: 'R',
  Trader: '$',
  Monitor: 'M',
  Creative: '*',
  Critic: '!',
};

function AgentNodeComponent({ data, selected }: NodeProps) {
  const d = data as AgentNodeData;
  return (
    <div className={`agent-node ${STATUS_CLASS[d.status]} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="agent-node-header">
        <span className="role-icon">{ROLE_ICON[d.role]}</span>
        <div className="agent-node-titles">
          <strong>{d.label}</strong>
          <span className="role-tag">{d.role}</span>
        </div>
        <span className={`status-dot ${STATUS_CLASS[d.status]}`} title={d.status} />
      </div>
      <div className="agent-node-stats">
        <div className="mini-bar">
          <span>Skill</span>
          <div className="bar-track">
            <div className="bar-fill skill" style={{ width: `${d.skill * 100}%` }} />
          </div>
        </div>
        <div className="mini-bar">
          <span>Energy</span>
          <div className="bar-track">
            <div className="bar-fill energy" style={{ width: `${d.energy}%` }} />
          </div>
        </div>
        <div className="agent-node-meta">
          <span className="status-label">{d.status}</span>
          <span>✓ {d.tasksCompleted}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
