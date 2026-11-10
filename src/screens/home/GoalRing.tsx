import { Sticker } from "../../ui/stickers";

/** Progress ring for the weekly goal (training days this week / goal). */
export const GoalRing = ({ done, goal }: { done: number; goal: number }) => {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const share = Math.min(1, done / goal);
  return (
    <svg className="goal-ring" width={84} height={84} viewBox="0 0 84 84" aria-hidden>
      <circle cx={42} cy={42} r={r} fill="#fff" stroke="var(--ink)" strokeWidth={3} />
      <circle cx={42} cy={42} r={r} fill="none" stroke="#fff" strokeWidth={11} />
      <circle
        cx={42}
        cy={42}
        r={r}
        fill="none"
        stroke={share >= 1 ? "var(--bg)" : "var(--pink)"}
        strokeWidth={11}
        strokeDasharray={`${share * circumference} ${circumference}`}
        transform="rotate(-90 42 42)"
      />
      <circle cx={42} cy={42} r={r + 5.5} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
      <circle cx={42} cy={42} r={r - 5.5} fill="var(--yellow)" stroke="var(--ink)" strokeWidth={2.5} />
      <foreignObject x={22} y={22} width={40} height={40}>
        <div className="goal-ring-center">{share >= 1 ? <Sticker name="medal" size={30} /> : <Sticker name="flame" size={28} />}</div>
      </foreignObject>
    </svg>
  );
};
