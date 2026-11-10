import { useState } from "react";
import { getExercise, type TemplateItem, type Workout as WorkoutModel } from "../../domain/model";
import { Segmented, Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";
import { formatDate, plural } from "../../ui/text";
import { templateItems, workoutToItems } from "../../ui/workoutOps";
import { describeSets } from "./format";

/** Copy exercises from a template or an earlier workout. */
export const CopySheet = ({ workout, onClose }: { workout: WorkoutModel; onClose: () => void }) => {
  const app = useApp();
  const { t, data, actions, lang, exerciseName } = app;
  const [source, setSource] = useState<"templates" | "workouts">(data.templates.length > 0 ? "templates" : "workouts");
  const [selected, setSelected] = useState<{ id: string; items: readonly TemplateItem[]; templateId: string | null } | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());

  const choose = (id: string, items: readonly TemplateItem[], templateId: string | null) => {
    setSelected({ id, items, templateId });
    setChecked(new Set(items.map((_, i) => i)));
  };
  const apply = () => {
    if (!selected) return;
    actions.addItems(
      workout,
      selected.items.filter((_, i) => checked.has(i)),
    );
    if (selected.templateId && !workout.templateId) actions.updateWorkout(workout.id, { templateId: selected.templateId });
    onClose();
  };

  const sources =
    source === "templates"
      ? data.templates.map((tpl) => ({
          id: tpl.id,
          title: tpl.name,
          subtitle: `${tpl.items.length} ${plural(tpl.items.length, t("Übung", "exercise"), t("Übungen", "exercises"))}`,
          items: templateItems(data, tpl, workout.id),
          templateId: tpl.id,
        }))
      : data.workouts
          .filter((w) => w.id !== workout.id && w.exercises.length > 0)
          .slice(0, 40)
          .map((w) => ({
            id: w.id,
            title: formatDate(w.date, lang, "long"),
            subtitle: w.exercises.map((e) => exerciseName(getExercise(data, e.exerciseKey))).join(", "),
            items: workoutToItems(w),
            templateId: w.templateId,
          }));

  return (
    <Sheet title={t("Übernehmen", "Copy from")} onClose={onClose}>
      <Segmented
        value={source}
        onChange={(v) => {
          setSource(v);
          setSelected(null);
        }}
        options={[
          { value: "templates", label: t("Vorlagen", "Templates") },
          { value: "workouts", label: t("Frühere Trainings", "Past workouts") },
        ]}
      />
      {sources.length === 0 && (
        <p className="hint">
          {source === "templates"
            ? t(
                "Noch keine Vorlagen. Speichere ein Training als Vorlage oder lass dir unter Mehr → Vorlagen einen Trainingsplan erstellen.",
                "No templates yet. Save a workout as a template, or create a training plan under More → Templates.",
              )
            : t("Noch keine früheren Trainings.", "No past workouts yet.")}
        </p>
      )}
      <div className="stack">
        {sources.map((s) => (
          <div key={s.id} className={`card pick-card ${selected?.id === s.id ? "open" : ""}`}>
            <button className="pick-head" onClick={() => (selected?.id === s.id ? setSelected(null) : choose(s.id, s.items, s.templateId))}>
              <strong>{s.title}</strong>
              <small>{s.subtitle}</small>
            </button>
            {selected?.id === s.id && (
              <>
                {s.items.map((item, i) => (
                  <label key={i} className="check-line">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() => {
                        const next = new Set(checked);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setChecked(next);
                      }}
                    />
                    <span>
                      {exerciseName(getExercise(data, item.exerciseKey))}
                      <small> {describeSets(app, item.sets, getExercise(data, item.exerciseKey).metric)}</small>
                    </span>
                  </label>
                ))}
                <button className="button dark full" disabled={checked.size === 0} onClick={apply}>
                  {t(
                    `${checked.size} ${plural(checked.size, "Übung", "Übungen")} übernehmen`,
                    `Copy ${checked.size} ${plural(checked.size, "exercise", "exercises")}`,
                  )}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
};
