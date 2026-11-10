import { useEffect, useRef, useState } from "react";
import { formatDuration, parseDuration } from "../../domain/units";

export const DurationField = ({ value, onCommit, label }: { value: number | null; onCommit: (v: number | null) => void; label: string }) => {
  const [text, setText] = useState(value == null ? "" : formatDuration(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : formatDuration(value));
  }, [value]);
  return (
    <input
      className="num-input wide"
      inputMode="numeric"
      aria-label={label}
      placeholder="m:ss"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        const parsed = text.trim() === "" ? null : parseDuration(text);
        if (parsed === undefined || (text.trim() !== "" && parsed === null)) return setText(value == null ? "" : formatDuration(value));
        if (parsed !== value) onCommit(parsed);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
};

/**
 * Big −/+ buttons around a field: easier than the keyboard with sweaty hands.
 * They're left out of the tab order so Tab jumps from field to field on a
 * computer, where typing is faster anyway.
 */
export const Stepper = ({ label, onStep, children }: { label: string; onStep: (direction: -1 | 1) => void; children: React.ReactNode }) => (
  <span className="stepper">
    <button className="step" tabIndex={-1} onClick={() => onStep(-1)} aria-label={`${label} −`}>
      −
    </button>
    {children}
    <button className="step" tabIndex={-1} onClick={() => onStep(1)} aria-label={`${label} +`}>
      +
    </button>
  </span>
);

/** Weight step per tap, by equipment and unit (EGYM adjusts in 1 kg steps, kettlebells come in 4 kg jumps). */
export const weightStep = (equipment: string, unit: "kg" | "lb"): number => {
  if (equipment === "kettlebell") return unit === "lb" ? 8 : 4;
  if (unit === "lb") return equipment === "egym" || equipment === "dumbbell" ? 2.5 : 5;
  return equipment === "egym" || equipment === "dumbbell" || equipment === "other" ? 1 : 2.5;
};
