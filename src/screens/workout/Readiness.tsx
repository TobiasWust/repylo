import { useState } from "react";
import { today } from "../../domain/dates";
import type { Workout as WorkoutModel } from "../../domain/model";
import { readinessOf } from "../../domain/readiness";
import { Icon, Segmented } from "../../ui/components";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";

/**
 * Readiness check before today's workout, then a short hint for the day.
 * Poor readiness also makes the progression suggestions lighter.
 */
export const Readiness = ({ workout }: { workout: WorkoutModel }) => {
  const { t, actions } = useApp();
  const [sleep, setSleep] = useState<number | null>(null);
  if (workout.date !== today()) return null;
  const level = readinessOf(workout);
  const asked = workout.sleep !== null || workout.energy !== null;
  const started = workout.exercises.some((e) => e.sets.some((s) => s.done));

  if (!asked && !started) {
    const answer = (energy: number) => actions.updateWorkout(workout.id, { sleep: sleep ?? 2, energy });
    return (
      <section className="card readiness">
        <div className="suggestion-head">
          <Sticker name="scale" size={30} />
          <h3>{t("Wie ist deine Tagesform?", "How are you feeling today?")}</h3>
          <button
            className="icon-button small"
            onClick={() => actions.updateWorkout(workout.id, { sleep: 0, energy: 0 })}
            aria-label={t("Überspringen", "Skip")}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="field-label">{t("Schlaf letzte Nacht", "Sleep last night")}</div>
        <Segmented
          value={String(sleep ?? "")}
          onChange={(v) => setSleep(Number(v))}
          options={[
            { value: "1", label: t("Schlecht", "Poor") },
            { value: "2", label: t("Okay", "Okay") },
            { value: "3", label: t("Gut", "Good") },
          ]}
        />
        <div className="field-label">{t("Energie jetzt", "Energy right now")}</div>
        <Segmented
          value=""
          onChange={(v) => answer(Number(v))}
          options={[
            { value: "1", label: t("Müde", "Tired") },
            { value: "2", label: t("Normal", "Normal") },
            { value: "3", label: t("Fit", "Fresh") },
          ]}
        />
      </section>
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
  if (level === "high")
    return (
      <div className="coach-line positive">
        <Sticker name="flame" size={28} />
        <span>{t("Top-Tagesform! Ein guter Tag für einen Rekordversuch.", "Great shape today! A good day to go for a record.")}</span>
      </div>
    );
  return null;
};
