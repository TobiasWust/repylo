import { useState } from "react";
import { workoutSummary } from "../../domain/coach";
import { addDays, today, weekStart } from "../../domain/dates";
import { hasValue } from "../../domain/stats";
import { formatNumber } from "../../domain/units";
import { useApp } from "../../ui/context";
import { Icon } from "../../ui/components";
import { Sticker } from "../../ui/stickers";
import { formatDate } from "../../ui/text";

/** One day's workouts for the heatmap bubble: how it went, not just what was done. */
const DayInfo = ({ day, column, pinned, onUnpin }: { day: string; column: number; pinned: boolean; onUnpin: () => void }) => {
  const { t, data, lang, open, weight } = useApp();
  const workouts = data.workouts.filter((w) => w.date === day && w.exercises.some((e) => e.sets.some(hasValue)));
  // Keep the arrow under the selected column, but the bubble itself inside the card.
  const arrow = `${((column + 0.5) / 20) * 100}%`;
  return (
    <div className={`day-bubble ${pinned ? "pinned" : ""}`} style={{ "--arrow": arrow } as React.CSSProperties}>
      <div className="day-bubble-head">
        <strong>{formatDate(day, lang, "long")}</strong>
        {pinned && (
          <button className="icon-button small" onClick={onUnpin} aria-label={t("Schließen", "Close")}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {workouts.length === 0 ? (
        <small>{t("Kein Training – Ruhetag", "No workout – rest day")}</small>
      ) : (
        workouts.map((w) => {
          const summary = workoutSummary(data, w.id);
          if (!summary) return null;
          const name = data.templates.find((x) => x.id === w.templateId)?.name ?? t("Training", "Workout");
          const change = summary.averageChange;
          return (
            <button key={w.id} className="day-bubble-row" onClick={() => open({ type: "workout", id: w.id })}>
              <Sticker name={change !== null && change > 0 ? "chartUp" : "dumbbell"} size={28} />
              <span className="list-main">
                <span className="day-bubble-name">{name}</span>
                <span className="day-bubble-stats">
                  {change !== null && (
                    <span className={change >= 0 ? "up" : "down"}>
                      Ø {change >= 0 ? "+" : ""}
                      {formatNumber(change, lang, 1)} %
                    </span>
                  )}
                  {summary.records.length > 0 && (
                    <span className="up">
                      {summary.records.length}{" "}
                      {t(summary.records.length === 1 ? "Bestwert" : "Bestwerte", summary.records.length === 1 ? "best" : "bests")}
                    </span>
                  )}
                </span>
                <small>
                  {summary.sets} {t("Sätze", "sets")}
                  {summary.volume > 0 && ` · ${weight(summary.volume)}`}
                  {summary.minutes !== null && ` · ${summary.minutes} min`}
                </small>
              </span>
              <span className="chev">›</span>
            </button>
          );
        })
      )}
      {workouts.some((w) => workoutSummary(data, w.id)?.averageChange !== null) && (
        <small className="day-bubble-hint">
          {t(
            "Ø = Veränderung des geschätzten 1RM gegenüber dem jeweils letzten Mal.",
            "Ø = change of the estimated 1RM vs. each exercise's previous session.",
          )}
        </small>
      )}
    </div>
  );
};

/**
 * GitHub-style heatmap of the last 20 weeks. With a mouse, hovering previews
 * a day; a click (or tap) pins it so the bubble's buttons can be used.
 */
export const Heatmap = ({ days }: { days: ReadonlySet<string> }) => {
  const { t, lang } = useApp();
  const start = addDays(weekStart(today()), -7 * 19);
  const weeks = Array.from({ length: 20 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const [selected, setSelected] = useState<{ day: string; column: number; pinned: boolean } | null>(null);

  const pin = (day: string, column: number) => setSelected(selected?.pinned && selected.day === day ? null : { day, column, pinned: true });
  const preview = (day: string, column: number) => {
    if (!selected?.pinned) setSelected({ day, column, pinned: false });
  };

  return (
    <>
      <div className="heatmap" onPointerLeave={() => !selected?.pinned && setSelected(null)}>
        {weeks.map((week, column) => (
          <div key={column} className="heatmap-col">
            {week.map((d) => (
              <button
                key={d}
                className={`heat ${days.has(d) ? "on" : ""} ${d > today() ? "future" : ""} ${selected?.day === d ? "selected" : ""}`}
                disabled={d > today()}
                aria-label={formatDate(d, lang, "long")}
                aria-pressed={selected?.pinned === true && selected.day === d}
                onClick={() => pin(d, column)}
                onPointerEnter={(e) => e.pointerType === "mouse" && preview(d, column)}
              />
            ))}
          </div>
        ))}
      </div>
      {selected ? (
        <DayInfo day={selected.day} column={selected.column} pinned={selected.pinned} onUnpin={() => setSelected(null)} />
      ) : (
        <p className="hint">{t("Tippe auf einen Tag für Details.", "Tap a day for details.")}</p>
      )}
    </>
  );
};
