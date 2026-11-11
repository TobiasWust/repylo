import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { reducedMotion } from "./motion";
import { Sticker, type StickerName } from "./stickers";

const paths = {
  home: "M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  scale: "M5 4h14l2 16H3zM9 9a3 3 0 0 1 6 0M12 9l1.5-2",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.6 4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l5 5L20 7",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  back: "M15 5l-7 7 7 7",
  forward: "M9 5l7 7-7 7",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  close: "M6 6l12 12M18 6 6 18",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  copy: "M8 8h12v12H8zM4 16V4h12",
  star: "M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  dumbbell: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12",
  sync: "M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4",
  note: "M5 4h14v16H5zM8 9h8M8 13h8M8 17h5",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  download: "M12 4v12M6 10l6 6 6-6M4 20h16",
  upload: "M12 20V8M6 14l6-6 6 6M4 4h16",
} as const;

export type IconName = keyof typeof paths;

export const Icon = ({ name, size = 22 }: { name: IconName; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={paths[name]} />
  </svg>
);

/** Bottom sheet modal. Closes on backdrop tap. */
export const Sheet = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
};

/**
 * Numeric input that keeps its own text while typing ("12," or "") and only
 * commits a parsed number on blur, so partially typed values aren't saved.
 */
export const NumberField = ({
  value,
  onCommit,
  placeholder,
  decimals = true,
  label,
  className = "",
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder?: string;
  decimals?: boolean;
  label: string;
  className?: string;
}) => {
  // German users expect "62,5"; the app sets <html lang> from the language setting.
  const format = (v: number | null) => {
    if (v == null) return "";
    const text = String(Math.round(v * 100) / 100);
    return document.documentElement.lang === "de" ? text.replace(".", ",") : text;
  };
  const [text, setText] = useState(format(value));
  const focused = useRef(false);
  useEffect(() => {
    // Sync external changes (e.g. from another device) unless the user is typing.
    if (!focused.current) setText(format(value));
  }, [value]);
  const commit = () => {
    focused.current = false;
    const normalized = text.replace(",", ".").trim();
    const parsed = normalized === "" ? null : Number(normalized);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setText(format(value));
      return;
    }
    if (parsed !== value) onCommit(parsed);
  };
  return (
    <input
      className={`num-input ${className}`}
      inputMode={decimals ? "decimal" : "numeric"}
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
};

export interface Point {
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

/** Minimal responsive SVG line chart with tap-to-inspect. */
export const LineChart = ({
  points,
  secondary,
  format,
  color = "var(--ink)",
  height = 180,
}: {
  points: readonly Point[];
  secondary?: readonly Point[];
  format: (y: number) => string;
  color?: string;
  height?: number;
}) => {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;
  const width = 340;
  const pad = { top: 16, right: 12, bottom: 24, left: 40 };
  const all = [...points, ...(secondary ?? [])];
  const minX = Math.min(...all.map((p) => p.x)),
    maxX = Math.max(...all.map((p) => p.x));
  let minY = Math.min(...all.map((p) => p.y)),
    maxY = Math.max(...all.map((p) => p.y));
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const spread = maxY - minY;
  minY -= spread * 0.1;
  maxY += spread * 0.1;
  const sx = (x: number) =>
    pad.left + (maxX === minX ? (width - pad.left - pad.right) / 2 : ((x - minX) / (maxX - minX)) * (width - pad.left - pad.right));
  const sy = (y: number) => pad.top + (1 - (y - minY) / (maxY - minY)) * (height - pad.top - pad.bottom);
  const line = (list: readonly Point[]) => list.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  const ticks = [minY + spread * 0.1, (minY + maxY) / 2, maxY - spread * 0.1];
  const activePoint = active !== null ? points[active] : null;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {ticks.map((y) => (
          <g key={y}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(y)} y2={sy(y)} className="chart-grid" />
            <text x={pad.left - 6} y={sy(y) + 4} textAnchor="end" className="chart-tick">
              {format(y)}
            </text>
          </g>
        ))}
        {secondary && <path d={line(secondary)} fill="none" stroke="var(--pink)" strokeWidth={3} strokeLinecap="round" />}
        <path
          d={line(points)}
          fill="none"
          stroke={color}
          strokeWidth={secondary ? 1.5 : 3}
          strokeLinejoin="round"
          strokeDasharray={secondary ? "3 4" : undefined}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={active === i ? 7 : points.length > 40 ? 2.5 : 4.5}
            className="chart-dot"
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
        <text x={pad.left} y={height - 6} className="chart-tick">
          {points[0]!.label}
        </text>
        <text x={width - pad.right} y={height - 6} textAnchor="end" className="chart-tick">
          {points.at(-1)!.label}
        </text>
      </svg>
      {activePoint && (
        <div className="chart-tooltip">
          {activePoint.label}: <strong>{format(activePoint.y)}</strong>
        </div>
      )}
    </div>
  );
};

/**
 * A number that counts up from zero when it first appears. React renders the
 * final text; the animation only rewrites that same text node, so later
 * updates from React still land.
 */
export const CountUp = ({
  value,
  format = String,
  duration = 700,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [initial] = useState(value);
  useLayoutEffect(() => {
    const node = ref.current?.firstChild;
    if (!node || reducedMotion() || initial === 0) return;
    const final = format(initial);
    const start = performance.now();
    let frame = 0;
    let written = final;
    const write = (text: string) => {
      // React changed the value meanwhile: its text wins, stop animating.
      if (node.nodeValue !== written) return false;
      node.nodeValue = written = text;
      return true;
    };
    const step = (now: number) => {
      // A frame's timestamp can be a hair earlier than `start`.
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      if (write(p < 1 ? format(initial * (1 - (1 - p) ** 3)) : final) && p < 1) frame = requestAnimationFrame(step);
    };
    step(start);
    // Frames pause in hidden tabs; never leave the number stuck halfway.
    const finish = setTimeout(() => {
      cancelAnimationFrame(frame);
      write(final);
    }, duration + 100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(finish);
      write(final);
    };
    // Only the first appearance counts up; later changes just show the new value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <span ref={ref}>{format(value)}</span>;
};

export const BarChart = ({
  bars,
  format,
  height = 150,
}: {
  bars: readonly { label: string; value: number; highlight?: boolean }[];
  format: (v: number) => string;
  height?: number;
}) => {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="bar-chart" style={{ height }}>
      {bars.map((b, i) => (
        <div key={i} className="bar-col" title={`${b.label}: ${format(b.value)}`}>
          <div
            className={`bar ${b.highlight ? "bar-highlight" : ""}`}
            style={{ height: `${(b.value / max) * 100}%`, "--i": i } as React.CSSProperties}
          />
          <span className="bar-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
};

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const index = options.findIndex((o) => o.value === value);
  // The dark marker is one element that slides to the chosen option. It is
  // positioned straight on the DOM (no re-render) and follows size changes.
  useLayoutEffect(() => {
    const el = box.current;
    const marker = pill.current;
    if (!el || !marker) return;
    const place = () => {
      const button = el.querySelectorAll("button")[index];
      marker.style.opacity = button ? "1" : "0";
      if (!button) return;
      marker.style.transform = `translateX(${button.offsetLeft}px)`;
      marker.style.width = `${button.offsetWidth}px`;
    };
    place();
    // Only animate moves, not the first placement.
    const frame = requestAnimationFrame(() => marker.classList.add("ready"));
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [index, options.length]);
  return (
    <div className="segmented" role="radiogroup" ref={box}>
      <span className="segmented-pill" ref={pill} aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export const Empty = ({ sticker, children }: { sticker: StickerName; children: ReactNode }) => (
  <div className="empty">
    <Sticker name={sticker} size={64} />
    <div>{children}</div>
  </div>
);

/**
 * Tiny trend line for lists. Rising trends are mint, falling ones pink; the
 * last point is marked so "now" is easy to spot.
 */
export const Sparkline = ({ values, width = 84, height = 32 }: { values: readonly number[]; width?: number; height?: number }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const points = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (width - 2 * pad),
    pad + (1 - (v - min) / span) * (height - 2 * pad),
  ]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x!.toFixed(1)},${y!.toFixed(1)}`).join("");
  const area = `${line}L${points.at(-1)![0]!.toFixed(1)},${height}L${points[0]![0]!.toFixed(1)},${height}Z`;
  const rising = values.at(-1)! >= values[0]!;
  const [lastX, lastY] = points.at(-1)!;
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={area} fill={rising ? "var(--mint)" : "var(--pink)"} opacity={0.6} />
      <path d={line} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={3.5} fill="var(--yellow)" stroke="var(--ink)" strokeWidth={2} />
    </svg>
  );
};
