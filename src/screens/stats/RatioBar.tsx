import { Sticker } from "../../ui/stickers";

export const RatioBar = ({ left, right, leftLabel, rightLabel }: { left: number; right: number; leftLabel: string; rightLabel: string }) => {
  const total = left + right;
  const pct = total === 0 ? 50 : (left / total) * 100;
  const balanced = total === 0 || (left <= right * 1.5 && right <= left * 1.5);
  return (
    <div className="ratio">
      <div className="ratio-labels">
        <span>
          {leftLabel} <strong>{Math.round(left)}</strong>
        </span>
        <Sticker name={balanced ? "ok" : "warn"} size={22} />
        <span>
          <strong>{Math.round(right)}</strong> {rightLabel}
        </span>
      </div>
      <div className="ratio-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
