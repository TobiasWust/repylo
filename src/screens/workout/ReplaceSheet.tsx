import { useMemo, useState } from "react";
import { alternatives } from "../../domain/alternatives";
import type { Equipment } from "../../domain/exercises";
import { getExercise, type Workout, type WorkoutExercise } from "../../domain/model";
import { Icon, Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { equipmentName, muscleName } from "../../ui/text";
import { initialSets } from "../../ui/workoutOps";

/** Shown at once without a filter; the equipment chips reach the rest. */
const shortList = 12;

/** Other exercises for the same muscles, to swap in when a machine is missing or for variety. */
export const ReplaceSheet = ({
  workout,
  entry,
  onClose,
  onReplaced,
}: {
  workout: Workout;
  entry: WorkoutExercise;
  onClose: () => void;
  /** Gets the new exercise's id, e.g. to keep it open. */
  onReplaced?: (id: string) => void;
}) => {
  const { t, lang, data, actions, exerciseName } = useApp();
  const { confirm } = useFeedback();
  const [equipment, setEquipment] = useState<"all" | Equipment>("all");
  const current = getExercise(data, entry.exerciseKey);

  const all = useMemo(
    () => alternatives(data, entry.exerciseKey, new Set(workout.exercises.map((e) => e.exerciseKey))),
    [data, entry.exerciseKey, workout.exercises],
  );
  const present = [...new Set(all.map((e) => e.equipment))];
  const list = equipment === "all" ? all.slice(0, shortList) : all.filter((e) => e.equipment === equipment);

  const pick = async (key: string) => {
    if (entry.sets.some((s) => s.done)) {
      const ok = await confirm({
        title: t("Übung ersetzen?", "Replace exercise?"),
        message: t(
          "Die schon erledigten Sätze dieser Übung werden dabei entfernt.",
          "The sets you already ticked off for this exercise will be removed.",
        ),
        confirmLabel: t("Ersetzen", "Replace"),
      });
      if (!ok) return;
    }
    const id = actions.replaceExercise(workout, entry.id, key, initialSets(data, key, workout.id));
    onClose();
    if (id) onReplaced?.(id);
  };

  return (
    <Sheet title={t(`${exerciseName(current)} ersetzen`, `Replace ${exerciseName(current)}`)} onClose={onClose}>
      <p className="hint">
        {t(
          `Übungen für ${current.primary.map((m) => muscleName(m, lang)).join(", ") || "dasselbe"} – passend zuerst.`,
          `Exercises for ${current.primary.map((m) => muscleName(m, lang)).join(", ") || "the same"} – best match first.`,
        )}
      </p>
      {present.length > 1 && (
        <div className="chips scroll-x" role="group" aria-label={t("Gerät", "Equipment")}>
          {(["all", ...present] as const).map((value) => (
            <button key={value} className={`chip ${equipment === value ? "selected" : ""}`} onClick={() => setEquipment(value)}>
              {value === "all" ? t("Alle", "All") : equipmentName(value, lang)}
            </button>
          ))}
        </div>
      )}
      <div className="picker-list">
        {list.map((e) => (
          <button key={e.key} className="picker-item" onClick={() => void pick(e.key)}>
            <span className="list-main">
              <strong>{exerciseName(e)}</strong>
              <small>
                {equipmentName(e.equipment, lang)}
                {e.primary.length > 0 && ` · ${e.primary.map((m) => muscleName(m, lang)).join(", ")}`}
              </small>
            </span>
            <Icon name="sync" size={20} />
          </button>
        ))}
        {list.length === 0 && <p className="hint">{t("Keine passende Übung gefunden.", "No matching exercise found.")}</p>}
      </div>
    </Sheet>
  );
};
