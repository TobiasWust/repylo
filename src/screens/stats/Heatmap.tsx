import { useState } from "react";
import { addDays, today, weekStart } from "../../domain/dates";
import { getExercise } from "../../domain/model";
import { hasValue } from "../../domain/stats";
import { useApp } from "../../ui/context";
import { formatDate } from "../../ui/text";
import { Sticker } from "../../ui/stickers";

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
            w.exercises
              .map((e) => exerciseName(getExercise(data, e.exerciseKey)))
              .slice(0, 2)
              .join(", ");
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
export const Heatmap = ({ days }: { days: ReadonlySet<string> }) => {
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
      {selected ? (
        <DayInfo day={selected.day} column={selected.column} />
      ) : (
        <p className="hint">{t("Tippe auf einen Tag für Details.", "Tap a day for details.")}</p>
      )}
    </>
  );
};
