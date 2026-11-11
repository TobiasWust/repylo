/**
 * A cute front/back figure whose muscle groups are coloured by a value
 * (training volume or recovery). Shapes are deliberately simple and round –
 * a sticker, not an anatomy chart. Each muscle is tappable.
 */
import type { Muscle } from "../domain/exercises";

const ink = "var(--edge)";

type Shape = { readonly kind: "ellipse"; cx: number; cy: number; rx: number; ry: number } | { readonly kind: "path"; d: string };

const e = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: "ellipse", cx, cy, rx, ry });
const p = (d: string): Shape => ({ kind: "path", d });

/** Muscle shapes for the front figure (centre x = 55) and the back figure (centre x = 165). */
const front: Partial<Record<Muscle, readonly Shape[]>> = {
  shoulders: [e(29, 47, 6.5, 7), e(81, 47, 6.5, 7)],
  chest: [p("M36 44c5-2 12-2 17 0v15c-6 3-12 2-15-1-3-4-3-9-2-14z"), p("M74 44c-5-2-12-2-17 0v15c6 3 12 2 15-1 3-4 3-9 2-14z")],
  biceps: [e(22.5, 62, 4.3, 9), e(87.5, 62, 4.3, 9)],
  forearms: [e(21.5, 86, 3.6, 10), e(88.5, 86, 3.6, 10)],
  abs: [p("M47 64h16v28c0 4-4 7-8 7s-8-3-8-7z")],
  quads: [e(43, 128, 6.5, 18), e(67, 128, 6.5, 18)],
  // Inner thighs, one strip per leg.
  adductors: [e(50, 118, 2, 10), e(60, 118, 2, 10)],
  calves: [e(42.5, 170, 4.5, 11), e(67.5, 170, 4.5, 11)],
};
const back: Partial<Record<Muscle, readonly Shape[]>> = {
  upperBack: [p("M165 32c5 4 10 6 15 8-2 6-4 11-7 14h-16c-3-3-5-8-7-14 5-2 10-4 15-8z")],
  rearDelts: [e(139, 47, 6.5, 7), e(191, 47, 6.5, 7)],
  triceps: [e(132.5, 62, 4.3, 9), e(197.5, 62, 4.3, 9)],
  forearms: [e(131.5, 86, 3.6, 10), e(198.5, 86, 3.6, 10)],
  lats: [p("M149 58h12v26c-5-1-9-5-10-10-1-5-2-11-2-16z"), p("M181 58h-12v26c5-1 9-5 10-10 1-5 2-11 2-16z")],
  lowerBack: [p("M157 88h16v12h-16z")],
  glutes: [e(157, 110, 8, 7.5), e(173, 110, 8, 7.5)],
  hamstrings: [e(153, 134, 6.5, 17), e(177, 134, 6.5, 17)],
  calves: [e(152.5, 168, 5.2, 11), e(177.5, 168, 5.2, 11)],
};

/** Mirrors a path drawn for the left side (x relative to the centre) onto both sides. */
const both = (cx: number, left: (x: (dx: number) => number) => string) => [left((dx) => cx + dx), left((dx) => cx - dx)];

/**
 * A neutral adult figure with soft, organic outlines: no gendered cues,
 * arms and legs with a hint of shape. Friendly, not a robot.
 */
const Silhouette = ({ cx, face }: { cx: number; face: boolean }) => {
  const arms = both(
    cx,
    (x) =>
      `M${x(-27)} 42C${x(-35)} 46 ${x(-37)} 58 ${x(-36)} 68C${x(-36)} 80 ${x(-38)} 90 ${x(-35.5)} 100L${x(-30)} 100C${x(-30)} 90 ${x(-29.5)} 80 ${x(-28.5)} 70C${x(-28)} 62 ${x(-27)} 56 ${x(-25)} 50Z`,
  );
  const legs = both(
    cx,
    (x) =>
      `M${x(-21)} 100C${x(-23)} 118 ${x(-22)} 138 ${x(-19)} 150C${x(-21.5)} 163 ${x(-20)} 178 ${x(-16.5)} 192L${x(-9)} 192C${x(-9)} 178 ${x(-8)} 164 ${x(-8.5)} 150C${x(-6)} 138 ${x(-3)} 120 ${x(-1.5)} 106Z`,
  );
  const torso = `M${cx - 5} 29C${cx - 5} 34 ${cx - 9} 36 ${cx - 20} 39C${cx - 27} 41 ${cx - 28} 48 ${cx - 27} 56C${cx - 26} 66 ${cx - 23} 72 ${cx - 23} 80C${cx - 23} 90 ${cx - 23} 98 ${cx - 22} 104C${cx - 16} 109 ${cx - 6} 111 ${cx} 111C${cx + 6} 111 ${cx + 16} 109 ${cx + 22} 104C${cx + 23} 98 ${cx + 23} 90 ${cx + 23} 80C${cx + 23} 72 ${cx + 26} 66 ${cx + 27} 56C${cx + 28} 48 ${cx + 27} 41 ${cx + 20} 39C${cx + 9} 36 ${cx + 5} 34 ${cx + 5} 29Z`;
  return (
    <g fill="var(--paper)" stroke={ink} strokeWidth={2} strokeLinejoin="round">
      {legs.map((d) => (
        <path key={d} d={d} />
      ))}
      <ellipse cx={cx - 13} cy={194} rx={6.5} ry={3.2} />
      <ellipse cx={cx + 13} cy={194} rx={6.5} ry={3.2} />
      {arms.map((d) => (
        <path key={d} d={d} />
      ))}
      <ellipse cx={cx - 33} cy={105} rx={3.4} ry={5} />
      <ellipse cx={cx + 33} cy={105} rx={3.4} ry={5} />
      <path d={torso} />
      <ellipse cx={cx} cy={17} rx={10} ry={12} />
      {face ? (
        <>
          <circle cx={cx - 3.6} cy={16} r={1.3} fill={ink} stroke="none" />
          <circle cx={cx + 3.6} cy={16} r={1.3} fill={ink} stroke="none" />
          <path d={`M${cx - 2.6} 21.5q2.6 2 5.2 0`} fill="none" strokeWidth={1.5} strokeLinecap="round" />
        </>
      ) : null}
    </g>
  );
};

export const BodyMap = ({
  colorOf,
  selected,
  onSelect,
  labels,
}: {
  colorOf: (m: Muscle) => string;
  selected: Muscle | null;
  onSelect: (m: Muscle) => void;
  labels: { front: string; back: string };
}) => {
  const draw = (map: Partial<Record<Muscle, readonly Shape[]>>) =>
    Object.entries(map).flatMap(([muscle, shapes]) =>
      shapes.map((s, i) => {
        const key = `${muscle}-${i}`;
        const props = {
          fill: colorOf(muscle as Muscle),
          stroke: ink,
          strokeWidth: selected === muscle ? 3.2 : 1.8,
          className: "body-muscle",
          onClick: () => onSelect(muscle as Muscle),
        };
        return s.kind === "ellipse" ? (
          <ellipse key={key} {...props} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />
        ) : (
          <path key={key} {...props} d={s.d} />
        );
      }),
    );
  return (
    <svg className="body-map" viewBox="0 0 220 214" role="img" aria-label={`${labels.front} / ${labels.back}`}>
      <Silhouette cx={55} face />
      <Silhouette cx={165} face={false} />
      {draw(front)}
      {draw(back)}
      <text x={55} y={210} textAnchor="middle" className="body-label">
        {labels.front}
      </text>
      <text x={165} y={210} textAnchor="middle" className="body-label">
        {labels.back}
      </text>
    </svg>
  );
};
