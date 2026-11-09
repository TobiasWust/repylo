import { useState } from "react";
import { addDays, today } from "../domain/dates";
import { getExercise } from "../domain/model";
import { Icon, Sheet } from "./components";
import { useApp } from "./context";
import { formatDate } from "./text";

/**
 * Log a workout for an earlier day ("nachtragen"). If that day already has a
 * workout, offer to open it instead of creating a duplicate by accident.
 */
export const BackfillSheet = ({ onClose }: { onClose: () => void }) => {
  const { t, data, actions, open, lang, exerciseName } = useApp();
  const [date, setDate] = useState(addDays(today(), -1));
  const existing = data.workouts.filter((w) => w.date === date);

  const create = () => {
    const id = actions.startWorkout(date);
    actions.updateWorkout(id, { finished: true });
    onClose();
    open({ type: "workout", id });
  };

  return (
    <Sheet title={t("Training nachtragen", "Log a past workout")} onClose={onClose}>
      <p className="hint">
        {t(
          "Für Trainings, die du noch nicht erfasst hast. Tipp: Mit „Übernehmen“ kopierst du ein ähnliches Training und passt nur noch die Werte an.",
          "For workouts you haven’t logged yet. Tip: use “Copy from” to start from a similar workout and just adjust the numbers.",
        )}
      </p>
      <label>
        {t("Datum", "Date")}
        <input type="date" className="text-input" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <div className="chips">
        {[1, 2, 3, 7].map((days) => (
          <button key={days} className={`chip ${date === addDays(today(), -days) ? "selected" : ""}`} onClick={() => setDate(addDays(today(), -days))}>
            {days === 1 ? t("Gestern", "Yesterday") : t(`vor ${days} Tagen`, `${days} days ago`)}
          </button>
        ))}
      </div>
      {existing.length > 0 && (
        <div className="stack tight">
          <p className="hint">{t(`Am ${formatDate(date, lang, "long")} gibt es schon:`, `Already logged on ${formatDate(date, lang, "long")}:`)}</p>
          {existing.map((w) => (
            <button
              key={w.id}
              className="card list-card"
              onClick={() => {
                onClose();
                open({ type: "workout", id: w.id });
              }}
            >
              <span className="list-main">
                <strong>{w.exercises.map((e) => exerciseName(getExercise(data, e.exerciseKey))).slice(0, 3).join(", ") || t("Leeres Training", "Empty workout")}</strong>
                <small>{t("Öffnen und ergänzen", "Open and add to it")}</small>
              </span>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      )}
      <button className="button dark full" onClick={create}>
        <Icon name="plus" /> {existing.length > 0 ? t("Weiteres Training anlegen", "Add another workout") : t(`Training am ${formatDate(date, lang)} anlegen`, `Create workout on ${formatDate(date, lang)}`)}
      </button>
    </Sheet>
  );
};
