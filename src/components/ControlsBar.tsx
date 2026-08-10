import { useAppStore, type SimSpeed } from '../store/useAppStore';

const SPEEDS: SimSpeed[] = [1, 2, 4, 8];

export function ControlsBar() {
  const running = useAppStore((s) => s.running);
  const speed = useAppStore((s) => s.speed);
  const tick = useAppStore((s) => s.snapshot.tick);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const step = useAppStore((s) => s.step);
  const setSpeed = useAppStore((s) => s.setSpeed);
  const resetDefault = useAppStore((s) => s.resetDefault);
  const resetEmpty = useAppStore((s) => s.resetEmpty);

  return (
    <div className="controls-bar" data-testid="controls-bar">
      <div className="control-group">
        {running ? (
          <button type="button" className="btn btn-warn" onClick={pause} data-testid="btn-pause">
            ⏸ Pause
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={play} data-testid="btn-play">
            ▶ Play
          </button>
        )}
        <button type="button" className="btn" onClick={step} disabled={running} data-testid="btn-step">
          ⏭ Step
        </button>
      </div>

      <div className="control-group speed-group">
        <span className="label">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-sm ${speed === s ? 'active' : ''}`}
            onClick={() => setSpeed(s)}
            data-testid={`speed-${s}`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="tick-display" data-testid="tick-display">
        Tick <strong>{tick}</strong>
        <span className={`run-indicator ${running ? 'on' : ''}`}>{running ? 'LIVE' : 'PAUSED'}</span>
      </div>

      <div className="control-group">
        <button type="button" className="btn" onClick={resetDefault} data-testid="btn-reset-default">
          Reset Collective
        </button>
        <button type="button" className="btn btn-ghost" onClick={resetEmpty}>
          Clear All
        </button>
      </div>
    </div>
  );
}
