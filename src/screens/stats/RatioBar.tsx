import { Sticker } from "../../ui/stickers";

export const RatioBar = ({
  left,
  right,
  leftLabel,
  rightLabel,
  ok,
  ideal = 1,
}: {
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
  ok: boolean;
  /** Healthy left:right ratio; marked on the bar. */
  ideal?: number;
}) => {
  const total = left + right;
  const pct = total === 0 ? 50 : (left / total) * 100;
  return (
    <div className="ratio">
      <div className="ratio-labels">
        <span>
          {leftLabel} <strong>{Math.round(left)}</strong>
        </span>
        <Sticker name={ok ? "ok" : "warn"} size={22} />
        <span>
          <strong>{Math.round(right)}</strong> {rightLabel}
        </span>
      </div>
      <div className="ratio-bar">
        <div style={{ width: `${pct}%` }} />
        <span className="ratio-ideal" style={{ left: `${(ideal / (ideal + 1)) * 100}%` }} />
      </div>
    </div>
  );
};
