import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type OnNodeDrag,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode, type AgentNodeData } from './AgentNode';
import { useAppStore } from '../store/useAppStore';
import { getAgentStatusColor } from '../sim';

const nodeTypes = { agent: AgentNode };

export function AgentGraph() {
  const snapshot = useAppStore((s) => s.snapshot);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const selectAgent = useAppStore((s) => s.selectAgent);
  const connectAgents = useAppStore((s) => s.connectAgents);
  const disconnect = useAppStore((s) => s.disconnect);
  const updateAgentPosition = useAppStore((s) => s.updateAgentPosition);

  const builtNodes: Node[] = useMemo(() => {
    return Object.values(snapshot.agents).map((a) => ({
      id: a.id,
      type: 'agent',
      position: a.position,
      selected: a.id === selectedAgentId,
      data: {
        label: a.name,
        role: a.role,
        status: a.status,
        skill: a.skill,
        energy: a.energy,
        tasksCompleted: a.tasksCompleted,
      } satisfies AgentNodeData,
    }));
  }, [snapshot.agents, selectedAgentId, snapshot.tick]);

  const builtEdges: Edge[] = useMemo(() => {
    return snapshot.connections.map((c) => ({
      id: c.id,
      source: c.source,
      target: c.target,
      animated: snapshot.messages.some(
        (m) =>
          m.tick >= snapshot.tick - 2 &&
          ((m.from === c.source && m.to === c.target) ||
            (m.from === c.target && m.to === c.source)),
      ),
      style: { stroke: '#475569', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 16, height: 16 },
    }));
  }, [snapshot.connections, snapshot.messages, snapshot.tick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  useEffect(() => {
    setNodes(builtNodes);
  }, [builtNodes, setNodes]);

  useEffect(() => {
    setEdges(builtEdges);
  }, [builtEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        connectAgents(connection.source, connection.target);
      }
    },
    [connectAgents],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      selectAgent(node.id);
    },
    [selectAgent],
  );

  const onPaneClick = useCallback(() => {
    selectAgent(null);
  }, [selectAgent]);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      updateAgentPosition(node.id, node.position);
    },
    [updateAgentPosition],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        disconnect(e.id);
      }
    },
    [disconnect],
  );

  return (
    <div className="graph-container" data-testid="agent-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1e293b" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const status = (n.data as AgentNodeData | undefined)?.status;
            return status ? getAgentStatusColor(status) : '#334155';
          }}
          maskColor="rgba(2, 6, 23, 0.7)"
          style={{ background: '#0f172a' }}
        />
      </ReactFlow>
    </div>
  );
}
