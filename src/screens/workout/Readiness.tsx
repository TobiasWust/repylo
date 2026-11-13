import { today } from "../../domain/dates";
import type { Workout as WorkoutModel } from "../../domain/model";
import { readinessOf } from "../../domain/readiness";
import { Icon } from "../../ui/components";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";

/**
 * Readiness check before today's workout: one line, gone after the answer
 * or the first set. A poor day makes the suggestions lighter and says so.
 */
export const Readiness = ({ workout }: { workout: WorkoutModel }) => {
  const { t, actions } = useApp();
  if (workout.date !== today()) return null;
  const level = readinessOf(workout);
  const asked = workout.sleep !== null || workout.energy !== null;
  const started = workout.exercises.some((e) => e.sets.some((s) => s.done));

  if (!asked && !started) {
    // One question instead of two: how you feel covers sleep and energy alike.
    const answer = (value: number) => actions.updateWorkout(workout.id, { sleep: value, energy: value });
    return (
      <div className="readiness-line">
        <span className="readiness-question">{t("Wie fühlst du dich?", "How do you feel?")}</span>
        <div className="chips" role="group" aria-label={t("Tagesform", "Readiness")}>
          <button className="chip" onClick={() => answer(1)}>
            {t("Müde", "Tired")}
          </button>
          <button className="chip" onClick={() => answer(2)}>
            {t("Normal", "Normal")}
          </button>
          <button className="chip" onClick={() => answer(3)}>
            {t("Fit", "Fresh")}
          </button>
        </div>
        <button
          className="icon-button small"
          onClick={() => actions.updateWorkout(workout.id, { sleep: 0, energy: 0 })}
          aria-label={t("Überspringen", "Skip")}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    );
  }
  if (level === "low")
    return (
      <div className="coach-line">
        <Sticker name="hourglass" size={28} />
        <span>
          {t(
            "Heute eher locker: Die Vorschläge sind etwa 10 % leichter. Sauber trainieren zählt mehr als Rekorde.",
            "Take it easier today: suggestions are about 10 % lighter. Clean reps matter more than records.",
          )}
        </span>
      </div>
    );
  return null;
};
