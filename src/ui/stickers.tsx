/**
 * Hand-drawn style stickers that replace emojis: flat app colours, thick ink
 * outline, some with a tiny face. All share a 32×32 grid so they line up.
 */
import type { ReactNode } from "react";

// Own tokens, so a dark theme can keep stickers bright with dark outlines
// while its surfaces and text go the other way.
const ink = "var(--sticker-ink)";
const c = {
  yellow: "var(--st-yellow)",
  pink: "var(--st-pink)",
  mint: "var(--st-mint)",
  lavender: "var(--st-lavender)",
  sky: "var(--st-sky)",
  white: "var(--st-white)",
  orange: "var(--st-orange)",
};

/** Two dot eyes and a smile, centred at (x, y). */
const Face = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle cx={-2.6} cy={0} r={1.1} fill={ink} stroke="none" />
    <circle cx={2.6} cy={0} r={1.1} fill={ink} stroke="none" />
    <path d="M-1.6 2.4q1.6 1.4 3.2 0" strokeWidth={1.6} />
  </g>
);

const art = {
  flame: (
    <>
      <path d="M16 2.5c1.2 4.6 8 7.4 8 15.5a8 8 0 0 1-16 0c0-4.6 2.4-7 4.4-9 .2 3 1.3 4.4 2.6 4.6-.6-4.4-.1-8 1-11.1z" fill={c.orange} />
      <path d="M16 15.5c2.6 2.4 4 4 4 6.4a4 4 0 0 1-8 0c0-2.4 1.4-4 4-6.4z" fill={c.yellow} />
      <Face x={16} y={21.6} scale={0.7} />
    </>
  ),
  dumbbell: (
    <>
      <rect x={9} y={14.2} width={14} height={3.6} rx={1.2} fill={c.white} />
      <rect x={5} y={8} width={5} height={16} rx={2} fill={c.yellow} />
      <rect x={22} y={8} width={5} height={16} rx={2} fill={c.yellow} />
      <rect x={1.8} y={11} width={3.4} height={10} rx={1.4} fill={c.pink} />
      <rect x={26.8} y={11} width={3.4} height={10} rx={1.4} fill={c.pink} />
    </>
  ),
  trophy: (
    <>
      <path d="M10 6.5H6.2a3.6 3.6 0 0 0 4.2 6M22 6.5h3.8a3.6 3.6 0 0 1-4.2 6" />
      <path d="M9.5 4h13v7a6.5 6.5 0 0 1-13 0z" fill={c.yellow} />
      <path d="M14 17.4h4v4h-4z" fill={c.white} />
      <rect x={9.5} y={21.4} width={13} height={5} rx={1.6} fill={c.pink} />
      <Face x={16} y={10} scale={0.85} />
    </>
  ),
  bulb: (
    <>
      <path d="M16 3.5a8.5 8.5 0 0 0-5 15.4c.9.7 1.4 1.7 1.4 2.8h7.2c0-1.1.5-2.1 1.4-2.8A8.5 8.5 0 0 0 16 3.5z" fill={c.yellow} />
      <rect x={12.2} y={21.7} width={7.6} height={6} rx={2} fill={c.white} />
      <path d="M12.6 24.7h6.8" strokeWidth={1.6} />
      <Face x={16} y={12.4} scale={0.85} />
    </>
  ),
  target: (
    <>
      <circle cx={15} cy={17} r={12} fill={c.pink} />
      <circle cx={15} cy={17} r={7.6} fill={c.white} />
      <circle cx={15} cy={17} r={3.4} fill={c.pink} />
      <path d="M15 17 26.5 5.5" />
      <path d="M24 3.5l.5 3.5 3.5.5" fill={c.yellow} />
    </>
  ),
  hourglass: (
    <>
      <path d="M10 4.5c0 6 5 7.5 5 11.5s-5 5.5-5 11.5h12c0-6-5-7.5-5-11.5s5-5.5 5-11.5z" fill={c.white} />
      <path d="M12.4 8h7.2c-.6 2.6-2.4 4.2-3.6 5.4-1.2-1.2-3-2.8-3.6-5.4z" fill={c.yellow} strokeWidth={1.4} />
      <path d="M12 26.2c.6-2.6 2.6-4 4-4.6 1.4.6 3.4 2 4 4.6z" fill={c.yellow} strokeWidth={1.4} />
      <path d="M7.5 4h17M7.5 28h17" strokeWidth={2.6} />
    </>
  ),
  balance: (
    <>
      <path d="M16 7v18M10.5 27h11M5 9.5h22M7 9.5 3 17M7 9.5l4 7.5M25 9.5 21 17M25 9.5l4 7.5" />
      <path d="M2.4 17h9.2a4.6 4.6 0 0 1-9.2 0z" fill={c.mint} />
      <path d="M20.4 17h9.2a4.6 4.6 0 0 1-9.2 0z" fill={c.lavender} />
      <circle cx={16} cy={6} r={2.4} fill={c.yellow} />
    </>
  ),
  chartUp: (
    <>
      <path d="M4.5 4v23.5H28" />
      <rect x={8.5} y={18} width={4.6} height={9.5} rx={1.2} fill={c.lavender} />
      <rect x={15} y={13} width={4.6} height={14.5} rx={1.2} fill={c.mint} />
      <rect x={21.5} y={7} width={4.6} height={20.5} rx={1.2} fill={c.yellow} />
    </>
  ),
  repeat: (
    <>
      <circle cx={16} cy={16} r={13.5} fill={c.yellow} />
      <path d="M8.6 13.5a7.8 7.8 0 0 1 13.6-3.6M23.4 18.5a7.8 7.8 0 0 1-13.6 3.6" />
      <path d="M22.6 5.6v4.6H18M9.4 26.4v-4.6H14" />
    </>
  ),
  note: (
    <>
      <path d="M7 3.5h13.5l4.5 4.5v20.5H7z" fill={c.white} />
      <path d="M20.5 3.5V8h4.5" />
      <path d="M11 13h10M11 17.5h10M11 22h6" strokeWidth={1.8} />
    </>
  ),
  calendar: (
    <>
      <rect x={4} y={6.5} width={24} height={22} rx={4.5} fill={c.white} />
      <path d="M4 13V11a4.5 4.5 0 0 1 4.5-4.5h15A4.5 4.5 0 0 1 28 11v2z" fill={c.pink} />
      <path d="M10.5 3.5v6M21.5 3.5v6" />
      <Face x={16} y={19.6} />
    </>
  ),
  scale: (
    <>
      <rect x={4} y={7} width={24} height={21} rx={6} fill={c.lavender} />
      <path d="M10 16.5a6 6 0 0 1 12 0z" fill={c.white} />
      <path d="M16 16.5l2.8-3.6" strokeWidth={1.8} />
      <Face x={16} y={22} scale={0.85} />
    </>
  ),
  muscle: (
    <>
      <path d="M3 28.5V19.5c1.6-1.6 3.4-2.4 5.4-2.6C8.6 9.6 17.4 8.4 18.6 15L18.8 10h8l.4 12.6c0 3.4-2.4 5.9-5.8 5.9z" fill={c.yellow} />
      <circle cx={22.8} cy={7.4} r={4.6} fill={c.yellow} />
      <path d="M19.6 8.8c1.6.2 3-.6 3.6-2" strokeWidth={1.5} />
      <path d="M5.4 11.4 3.8 9.6M9.2 8.6l-.6-2.4" strokeWidth={1.6} />
      <Face x={13.2} y={22} />
    </>
  ),
  medal: (
    <>
      <path d="M9.5 3h5.5l3 8h-5.5z" fill={c.pink} />
      <path d="M22.5 3H17l-3 8h5.5z" fill={c.sky} />
      <circle cx={16} cy={20} r={8.5} fill={c.yellow} />
      <path d="M16 15l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill={c.white} strokeWidth={1.4} />
    </>
  ),
  plate: (
    <>
      <circle cx={16} cy={16} r={13} fill={c.pink} />
      <circle cx={16} cy={16} r={8} fill={c.white} strokeWidth={1.6} />
      <circle cx={16} cy={16} r={2.8} fill={c.yellow} />
    </>
  ),
  ok: (
    <>
      <circle cx={16} cy={16} r={12.5} fill={c.mint} />
      <path d="M10.5 16.5l4 4 7.5-8.5" strokeWidth={2.6} />
    </>
  ),
  warn: (
    <>
      <path d="M16 3.5 29 27.5H3z" fill={c.yellow} />
      <path d="M16 12v7" strokeWidth={2.6} />
      <circle cx={16} cy={23.2} r={1.4} fill={ink} stroke="none" />
    </>
  ),
  party: (
    <>
      <path d="M4 28 11 8l13 13z" fill={c.yellow} />
      <path d="M7.4 18.4 15 26M9.4 12.6 19.4 22.6" strokeWidth={1.6} />
      <path d="M18 4.5v3M23.5 6l-2 2M27.5 11h-3" />
      <circle cx={26} cy={18} r={1.6} fill={c.pink} />
      <circle cx={20} cy={13} r={1.4} fill={c.sky} />
    </>
  ),
  phone: (
    <>
      <rect x={8.5} y={2.5} width={15} height={27} rx={3.5} fill={c.mint} />
      <rect x={11} y={6.5} width={10} height={14} rx={1.6} fill={c.yellow} strokeWidth={1.6} />
      <path d="M14 25.5h4" />
      <Face x={16} y={13.6} scale={0.7} />
    </>
  ),
  smile: (
    <>
      <circle cx={16} cy={16.5} r={12.5} fill={c.sky} />
      <path d="M13.5 4.4q1-2.6 3.6-2.2" strokeWidth={1.8} />
      <circle cx={9.6} cy={19.4} r={2} fill={c.pink} stroke="none" />
      <circle cx={22.4} cy={19.4} r={2} fill={c.pink} stroke="none" />
      <Face x={16} y={15.6} scale={1.5} />
    </>
  ),
  sleep: (
    <>
      <path d="M17 4.5a11.5 11.5 0 1 0 10.5 16A9.5 9.5 0 0 1 17 4.5z" fill={c.yellow} />
      <path d="M9.5 17.5q1.4 1.2 2.8 0M15.5 19q1.4 1.2 2.8 0" strokeWidth={1.6} />
      <path d="M12.5 23q1.2.8 2.4 0" strokeWidth={1.5} />
      <path d="M21 4h4l-4 4.5h4M26.5 10.5h3l-3 3.5h3" strokeWidth={1.6} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type StickerName = keyof typeof art;

export const Sticker = ({ name, size = 28, className = "" }: { name: StickerName; size?: number; className?: string }) => (
  <svg
    className={`sticker ${className}`}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    stroke={ink}
    strokeWidth={2.1}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {art[name]}
  </svg>
);
