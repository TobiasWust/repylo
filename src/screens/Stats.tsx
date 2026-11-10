import { useMemo, useState } from "react";
import { addDays, today, weekStart } from "../domain/dates";
import { getExercise } from "../domain/model";
import { exerciseSessions, hasValue, majorMuscles, recentPrs, setsPerMuscle, trainedDays, weeklySetTarget, weeklyVolume, weekStreak } from "../domain/stats";
import { formatNumber, toUnit } from "../domain/units";
import { BarChart, Empty } from "../ui/components";
import { useApp } from "../ui/context";
import { formatDate, muscleName } from "../ui/text";
import { Sticker } from "../ui/stickers";
import { StrengthOverview } from "../ui/StrengthLevel";
import { readinessInsights } from "../domain/readiness";

/** How readiness (sleep + energy) relates to performance, once there is enough data. */
const ReadinessCard = () => {
  const { t, data, lang } = useApp();
  const insights = useMemo(() => readinessInsights(data), [data]);
  if (insights.reduce((n, i) => n + i.workouts, 0) < 3) return null;
  const label = { low: t("Schwache Tagesform", "Low readiness"), mid: t("Mittlere Tagesform", "Medium readiness"), high: t("Top-Tagesform", "High readiness") };
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="scale" /> {t("Tagesform & Leistung", "Readiness & performance")}
      </h2>
      <p className="hint">{t("Durchschnittliche Veränderung deines 1RM gegenüber dem jeweils letzten Mal.", "Average change of your 1RM compared with the previous session.")}</p>
      <div className="stack tight">
        {insights.map((i) => (
          <div key={i.level} className="pr-line">
            <span>
              {label[i.level]} <small>· {i.workouts}×</small>
            </span>
            <strong className={i.change >= 0 ? "" : "negative"}>
              {i.change >= 0 ? "+" : ""}
              {formatNumber(i.change, lang, 1)} %
            </strong>
            <span />
          </div>
        ))}
      </div>
    </section>
  );
};

/** One day's summary for the heatmap bubble. */
const DayInfo = ({ day, column }: { day: string; column: number }) => {
  const { t, data, lang, open, exerciseName, weight } = useApp();
  const workouts = data.workouts.filter((w) => w.date === day && w.exercises.some((e) => e.sets.some(hasValue)));
  // Keep the arrow under the tapped column, but the bubble itself inside the card.
  const arrow = `${((column + 0.5) / 20) * 100}%`;
  return (
    <div className="day-bubble" style={{ "--arrow": arrow } as React.CSSProperties}>
      <strong>{formatDate(day, lang, "long")}</strong>
      {workouts.length === 0 ? (
        <small>{day > today() ? t("Noch nicht da", "Not here yet") : t("Kein Training – Ruhetag", "No workout – rest day")}</small>
      ) : (
        workouts.map((w) => {
          const sets = w.exercises.flatMap((e) => e.sets.filter(hasValue));
          const volume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
          const name =
            data.templates.find((x) => x.id === w.templateId)?.name ??
            w.exercises.map((e) => exerciseName(getExercise(data, e.exerciseKey))).slice(0, 2).join(", ");
          return (
            <button key={w.id} className="day-bubble-row" onClick={() => open({ type: "workout", id: w.id })}>
              <Sticker name="dumbbell" size={26} />
              <span className="list-main">
                <span className="day-bubble-name">{name}</span>
                <small>
                  {w.exercises.length} {t("Übungen", "exercises")} · {sets.length} {t("Sätze", "sets")}
                  {volume > 0 && ` · ${weight(volume)}`}
                </small>
              </span>
              <span className="chev">›</span>
            </button>
          );
        })
      )}
    </div>
  );
};

/** GitHub-style heatmap of the last 20 weeks; tap a day for details. */
const Heatmap = ({ days }: { days: ReadonlySet<string> }) => {
  const { t, lang } = useApp();
  const start = addDays(weekStart(today()), -7 * 19);
  const weeks = Array.from({ length: 20 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const [selected, setSelected] = useState<{ day: string; column: number } | null>(null);
  return (
    <>
      <div className="heatmap">
        {weeks.map((week, column) => (
          <div key={column} className="heatmap-col">
            {week.map((d) => (
              <button
                key={d}
                className={`heat ${days.has(d) ? "on" : ""} ${d > today() ? "future" : ""} ${selected?.day === d ? "selected" : ""}`}
                disabled={d > today()}
                aria-label={formatDate(d, lang, "long")}
                onClick={() => setSelected(selected?.day === d ? null : { day: d, column })}
                // With a mouse, hovering previews the day like a tooltip; on touch, tapping does.
                onPointerEnter={(e) => e.pointerType === "mouse" && d <= today() && setSelected({ day: d, column })}
              />
            ))}
          </div>
        ))}
      </div>
      {selected ? <DayInfo day={selected.day} column={selected.column} /> : <p className="hint">{t("Tippe auf einen Tag für Details.", "Tap a day for details.")}</p>}
    </>
  );
};

const RatioBar = ({ left, right, leftLabel, rightLabel }: { left: number; right: number; leftLabel: string; rightLabel: string }) => {
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

export const Stats = () => {
  const { t, data, lang, open, exerciseName, weight } = useApp();
  const days = useMemo(() => trainedDays(data), [data]);
  const weeks = useMemo(() => weeklyVolume(data, 12), [data]);
  const last7 = useMemo(() => setsPerMuscle(data, addDays(today(), -6)), [data]);
  const last14 = useMemo(() => setsPerMuscle(data, addDays(today(), -13)), [data]);
  const prs = useMemo(() => recentPrs(data, 6), [data]);
  const unit = data.settings.unit;
  const [target, upper] = weeklySetTarget[data.settings.goal];

  const exercises = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of data.workouts) for (const e of w.exercises) if (e.sets.some(hasValue)) counts.set(e.exerciseKey, (counts.get(e.exerciseKey) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([key, count]) => {
      const sessions = exerciseSessions(data, key);
      return { key, count, best: Math.max(0, ...sessions.map((s) => s.bestE1rm)) };
    });
  }, [data]);

  if (days.size === 0)
    return (
      <div className="screen">
        <h1 className="page-title">{t("Statistik", "Stats")}</h1>
        <Empty sticker="chartUp">{t("Sobald du trainiert hast, findest du hier deine Fortschritte.", "Once you’ve trained, your progress shows up here.")}</Empty>
      </div>
    );

  const pushPull = { push: 0, pull: 0 };
  for (const w of data.workouts) {
    if (w.date < addDays(today(), -13)) continue;
    for (const e of w.exercises) {
      const n = e.sets.filter(hasValue).length;
      const p = getExercise(data, e.exerciseKey).pattern;
      if (p === "push") pushPull.push += n;
      if (p === "pull") pushPull.pull += n;
    }
  }
  const totalWorkouts = data.workouts.filter((w) => w.exercises.some((e) => e.sets.some(hasValue))).length;
  const totalVolume = data.workouts.reduce((sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.reduce((v, x) => v + (x.weight ?? 0) * (x.reps ?? 0), 0), 0), 0);

  return (
    <div className="screen">
      <h1 className="page-title">{t("Statistik", "Stats")}</h1>

      <div className="stat-grid">
        <div className="stat-tile yellow">
          <span>{t("Trainings", "Workouts")}</span>
          <strong>{totalWorkouts}</strong>
        </div>
        <div className="stat-tile pink">
          <span>{t("Serie", "Streak")}</span>
          <strong className="with-sticker">
            <Sticker name="flame" size={26} /> {weekStreak(days, data.settings.weeklyGoal)} {t("Wo.", "wk")}
          </strong>
        </div>
        <div className="stat-tile lavender">
          <span>{t("Bewegt gesamt", "Total lifted")}</span>
          <strong>{formatNumber(toUnit(totalVolume, unit) / 1000, lang, 1)} t</strong>
        </div>
        <div className="stat-tile mint">
          <span>{t("Ø pro Woche (12 Wo.)", "Avg/week (12 wk)")}</span>
          <strong>{formatNumber(weeks.reduce((n, w) => n + w.workouts, 0) / weeks.length, lang, 1)}</strong>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">{t("Trainingstage", "Training days")}</h2>
        <Heatmap days={days} />
      </section>

      <section className="card">
        <h2 className="card-title">{t("Volumen pro Woche", "Volume per week")}</h2>
        <BarChart
          bars={weeks.map((w) => ({ label: formatDate(w.week, lang).replace(/\.$/, ""), value: toUnit(w.volume, unit), highlight: w.week === weekStart(today()) }))}
          format={(v) => `${formatNumber(v, lang, 0)} ${unit}`}
        />
      </section>

      <section className="card">
        <h2 className="card-title">{t("Sätze pro Muskelgruppe (7 Tage)", "Sets per muscle (7 days)")}</h2>
        <p className="hint">
          {t(`Ziel: ${target}–${upper} Sätze pro Woche. Hilfsmuskeln zählen halb.`, `Target: ${target}–${upper} sets per week. Secondary muscles count half.`)}
        </p>
        <div className="muscle-bars">
          {majorMuscles.map((m) => {
            const value = last7.get(m) ?? 0;
            const status = value >= target ? (value > upper ? "over" : "good") : value >= target / 2 ? "low" : "none";
            return (
              <div key={m} className="muscle-row">
                <span className="muscle-name">{muscleName(m, lang)}</span>
                <div className="muscle-track">
                  <div className={`muscle-fill ${status}`} style={{ width: `${Math.min(100, (value / upper) * 100)}%` }} />
                  <div className="muscle-target" style={{ left: `${(target / upper) * 100}%` }} />
                </div>
                <span className="muscle-value">{formatNumber(value, lang, 1)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">{t("Balance (14 Tage)", "Balance (14 days)")}</h2>
        <RatioBar left={pushPull.push} right={pushPull.pull} leftLabel={t("Drücken", "Push")} rightLabel={t("Ziehen", "Pull")} />
        <RatioBar left={last14.get("quads") ?? 0} right={last14.get("hamstrings") ?? 0} leftLabel={t("Quadrizeps", "Quads")} rightLabel={t("Beinbeuger", "Hamstrings")} />
      </section>

      <ReadinessCard />

      <StrengthOverview />

      <button className="card list-card review-link" onClick={() => open({ type: "review", month: today().slice(0, 7) })}>
        <Sticker name="party" size={34} />
        <span className="list-main">
          <strong>{t("Monatsrückblick", "Monthly review")}</strong>
          <small>{t("Deine Monate auf einen Blick – auch zum Teilen", "Your months at a glance – ready to share")}</small>
        </span>
        <span className="chev">›</span>
      </button>

      {prs.length > 0 && (
        <section className="card">
          <h2 className="card-title with-sticker">
            <Sticker name="trophy" /> {t("Letzte Rekorde", "Recent records")}
          </h2>
          <p className="hint">{t("Geschätztes Maximalgewicht für 1 Wiederholung, berechnet aus deinen Sätzen.", "Estimated one-rep max, calculated from your sets.")}</p>
          <div className="stack tight">
            {prs.map((pr, i) => (
              <button key={i} className="pr-line" onClick={() => open({ type: "exercise", key: pr.exerciseKey })}>
                <span>{exerciseName(getExercise(data, pr.exerciseKey))}</span>
                <strong>
                  <small>1RM ≈ </small>
                  {weight(pr.value)}
                </strong>
                <small>{formatDate(pr.date, lang)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">{t("Übungen", "Exercises")}</h2>
        <div className="stack">
          {exercises.map((e) => (
            <button key={e.key} className="card list-card" onClick={() => open({ type: "exercise", key: e.key })}>
              <span className="list-main">
                <strong>{exerciseName(getExercise(data, e.key))}</strong>
                <small>
                  {e.count} {t("Einheiten", "sessions")}
                  {e.best > 0 && ` · 1RM ${weight(e.best)}`}
                </small>
              </span>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
