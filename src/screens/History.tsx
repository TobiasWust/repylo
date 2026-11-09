import { useState } from "react";
import { getExercise } from "../domain/model";
import { hasValue } from "../domain/stats";
import { formatNumber, toUnit } from "../domain/units";
import { BackfillSheet } from "../ui/BackfillSheet";
import { Empty, Icon } from "../ui/components";
import { useApp } from "../ui/context";
import { formatDate, formatMonth } from "../ui/text";

export const History = () => {
  const { t, data, lang, open, exerciseName } = useApp();
  const unit = data.settings.unit;
  const [backfill, setBackfill] = useState(false);
  const months = new Map<string, typeof data.workouts>();
  for (const w of data.workouts) {
    const key = w.date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), w]);
  }

  return (
    <div className="screen">
      <div className="section-row">
        <h1 className="page-title">{t("Verlauf", "History")}</h1>
        <button className="button small yellow" onClick={() => setBackfill(true)}>
          <Icon name="plus" size={16} /> {t("Nachtragen", "Log past")}
        </button>
      </div>
      {data.workouts.length === 0 && <Empty emoji="🗓️">{t("Hier erscheinen deine Trainings.", "Your workouts will appear here.")}</Empty>}
      {[...months].map(([month, workouts]) => (
        <section key={month}>
          <h2 className="section-title">
            {formatMonth(`${month}-01`, lang)} <small>· {workouts.length}</small>
          </h2>
          <div className="stack">
            {workouts.map((w) => {
              const sets = w.exercises.flatMap((e) => e.sets.filter(hasValue));
              const volume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
              const template = data.templates.find((x) => x.id === w.templateId);
              return (
                <button key={w.id} className="card list-card" onClick={() => open({ type: "workout", id: w.id })}>
                  <span className="date-block">
                    <strong>{w.date.slice(8)}</strong>
                    <small>{new Date(`${w.date}T12:00`).toLocaleDateString(lang, { weekday: "short" })}</small>
                  </span>
                  <span className="list-main">
                    <strong>{template?.name ?? (w.exercises.map((e) => exerciseName(getExercise(data, e.exerciseKey))).slice(0, 2).join(", ") || t("Leeres Training", "Empty workout"))}</strong>
                    <small>
                      {w.exercises.length} {t("Übungen", "exercises")} · {sets.length} {t("Sätze", "sets")}
                      {volume > 0 && ` · ${formatNumber(toUnit(volume, unit), lang, 0)} ${unit}`}
                    </small>
                    {w.note && <small className="note-line">📝 {w.note}</small>}
                  </span>
                  <span className="chev">›</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {data.workouts.length > 0 && <p className="hint center">{formatDate(data.workouts.at(-1)!.date, lang, "long")} · {t("erstes Training", "first workout")}</p>}
      {backfill && <BackfillSheet onClose={() => setBackfill(false)} />}
    </div>
  );
};
