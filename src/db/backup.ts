/**
 * Plain JSON backup. Independent of Evolu's internal format so it stays
 * readable and can be re-imported into any future version.
 */
import type { Exercise } from "../domain/exercises";
import type { BodyWeight, Data, Template, Workout } from "../domain/model";
import type { Actions } from "./actions";

export interface Backup {
  readonly app: "repylo";
  readonly version: 1;
  readonly exportedAt: string;
  readonly workouts: readonly Workout[];
  readonly templates: readonly Template[];
  readonly bodyWeights: readonly BodyWeight[];
  readonly customExercises: readonly Exercise[];
}

export const createBackup = (data: Data): Backup => ({
  app: "repylo",
  version: 1,
  exportedAt: new Date().toISOString(),
  workouts: data.workouts,
  templates: data.templates,
  bodyWeights: data.bodyWeights,
  customExercises: [...data.exercises.values()].filter((e) => e.custom),
});

export const hasContent = (data: Data): boolean =>
  data.workouts.length > 0 || data.templates.length > 0 || data.bodyWeights.length > 0;

export const parseBackup = (json: string): Backup | null => {
  try {
    const value = JSON.parse(json) as Partial<Backup>;
    return value.app === "repylo" && value.version === 1 && Array.isArray(value.workouts) ? (value as Backup) : null;
  } catch {
    return null;
  }
};

/**
 * Imports as new rows. Custom exercise and template ids get new ids in the
 * target database, so references are remapped on the way in.
 */
export const importBackup = (backup: Backup, actions: Actions, data: Data): void => {
  const exerciseKeys = new Map<string, string>();
  for (const e of backup.customExercises) {
    const id = actions.createCustomExercise({
      name: e.name.de,
      equipment: e.equipment,
      metric: e.metric,
      pattern: e.pattern,
      primary: [...e.primary],
      secondary: [...e.secondary],
    });
    exerciseKeys.set(e.key, id);
  }
  const key = (k: string) => exerciseKeys.get(k) ?? k;

  const templateIds = new Map<string, string>();
  let templateData = data;
  for (const t of backup.templates) {
    const id = actions.saveTemplate(templateData, t.name, t.items.map((i) => ({ ...i, exerciseKey: key(i.exerciseKey) })));
    templateIds.set(t.id, id);
    templateData = { ...templateData, templates: [...templateData.templates, { ...t, id, position: templateData.templates.length }] };
  }

  for (const w of backup.workouts) {
    const id = actions.startWorkout(w.date, w.templateId ? (templateIds.get(w.templateId) ?? null) : null);
    actions.updateWorkout(id, {
      note: w.note,
      finished: w.finishedAt != null,
      // Older backups have no readiness fields.
      ...(w.sleep != null && { sleep: w.sleep }),
      ...(w.energy != null && { energy: w.energy }),
    });
    actions.addItems(
      { ...w, id, exercises: [] },
      w.exercises.map((e) => ({ exerciseKey: key(e.exerciseKey), sets: e.sets })),
    );
  }
  for (const b of backup.bodyWeights) actions.setBodyWeight(b.date, b.weight);
};

export const downloadJson = (filename: string, value: unknown): void => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
