import { useState } from "react";
import { clockTime, sessionTimes } from "../../domain/dates";
import type { Workout } from "../../domain/model";
import { workoutTimes } from "../../domain/stats";
import { Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";

/**
 * Change when a workout started and ended, e.g. after "Done" was tapped late
 * or for a workout logged afterwards. A running workout only has a start.
 */
export const TimeSheet = ({ workout, onClose }: { workout: Workout; onClose: () => void }) => {
  const { t, actions } = useApp();
  const times = workoutTimes(workout);
  const running = workout.finishedAt === null;
  const [start, setStart] = useState(times ? clockTime(times.start) : "18:00");
  const [end, setEnd] = useState(
    times?.end != null ? clockTime(times.end) : workout.finishedAt !== null && times ? clockTime(workout.finishedAt) : "19:00",
  );
  const result = sessionTimes(workout.date, start, running ? null : end);
  const minutes = result.end === null ? null : Math.round((result.end - result.start) / 60_000);

  const save = () => {
    actions.updateWorkout(workout.id, { startedAt: result.start, ...(!running && { finishedAt: result.end }) });
    onClose();
  };

  return (
    <Sheet title={t("Uhrzeit", "Time")} onClose={onClose}>
      <div className="time-fields">
        <label>
          <span className="field-label">{t("Beginn", "Start")}</span>
          <input className="text-input" type="time" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
        {!running && (
          <label>
            <span className="field-label">{t("Ende", "End")}</span>
            <input className="text-input" type="time" value={end} onChange={(e) => e.target.value && setEnd(e.target.value)} />
          </label>
        )}
      </div>
      {minutes !== null && (
        <p className="hint">
          {t("Dauer", "Duration")}: {minutes >= 60 ? `${Math.floor(minutes / 60)} h ` : ""}
          {minutes % 60} min
        </p>
      )}
      <button className="button dark full" onClick={save}>
        {t("Speichern", "Save")}
      </button>
    </Sheet>
  );
};
