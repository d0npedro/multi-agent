import { useEffect } from 'react';
import { AgentGraph } from './components/AgentGraph';
import { AgentPanel } from './components/AgentPanel';
import { ControlsBar } from './components/ControlsBar';
import {
  MetricsPanel,
  ResourcePanel,
  LogPanel,
  EventPanel,
  SaveLoadPanel,
  TaskPanel,
} from './components/Dashboard';
import { useAppStore } from './store/useAppStore';
import './App.css';

const BASE_INTERVAL_MS = 400;

function useSimLoop() {
  const running = useAppStore((s) => s.running);
  const speed = useAppStore((s) => s.speed);
  const applyTick = useAppStore((s) => s._applyTick);

  useEffect(() => {
    if (!running) return;
    const ms = Math.max(50, BASE_INTERVAL_MS / speed);
    const id = window.setInterval(() => {
      applyTick();
    }, ms);
    return () => window.clearInterval(id);
  }, [running, speed, applyTick]);
}

export default function App() {
  useSimLoop();

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <div>
            <h1>Agent Collective</h1>
            <p className="subtitle">Multi-agent simulation dashboard</p>
          </div>
        </div>
        <ControlsBar />
      </header>

      <main className="app-main">
        <aside className="sidebar left-sidebar">
          <AgentPanel />
          <SaveLoadPanel />
        </aside>

        <section className="center-stage">
          <AgentGraph />
        </section>

        <aside className="sidebar right-sidebar">
          <MetricsPanel />
          <ResourcePanel />
          <EventPanel />
          <TaskPanel />
          <LogPanel />
        </aside>
      </main>
    </div>
  );
}
