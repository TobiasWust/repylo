/**
 * Demo data (open the app with #demo). Six weeks of a push/pull/legs split
 * with steady progression, a bench press plateau and few hamstring sets, so
 * every statistic and suggestion rule has something to show.
 */
import { addDays, today } from "../domain/dates";
import type { Data, TemplateItem, TemplateSet } from "../domain/model";
import type { Actions } from "./actions";

const sets = (count: number, weight: number | null, reps: number): TemplateSet[] =>
  Array.from({ length: count }, () => ({ weight, reps, duration: null, distance: null }));

export const seedDemo = (actions: Actions, data: Data): void => {
  const push: TemplateItem[] = [
    { exerciseKey: "bench_press", sets: sets(3, 60, 8) },
    { exerciseKey: "overhead_press", sets: sets(3, 35, 8) },
    { exerciseKey: "lateral_raise", sets: sets(3, 8, 12) },
    { exerciseKey: "triceps_pushdown", sets: sets(3, 25, 10) },
  ];
  const pull: TemplateItem[] = [
    { exerciseKey: "lat_pulldown", sets: sets(3, 50, 10) },
    { exerciseKey: "cable_row", sets: sets(3, 45, 10) },
    { exerciseKey: "db_curl", sets: sets(3, 12, 10) },
  ];
  const legs: TemplateItem[] = [
    { exerciseKey: "squat", sets: sets(3, 70, 8) },
    { exerciseKey: "leg_press", sets: sets(3, 120, 10) },
    { exerciseKey: "leg_extension", sets: sets(3, 40, 12) },
  ];
  let templateData = data;
  const ids: string[] = [];
  for (const [name, items] of [
    ["Push", push],
    ["Pull", pull],
    ["Beine", legs],
  ] as const) {
    ids.push(actions.saveTemplate(templateData, name, items));
    templateData = {
      ...templateData,
      templates: [...templateData.templates, { id: "", name, position: templateData.templates.length, items }],
    };
  }

  const plan = [push, pull, legs];
  let session = 0;
  for (let day = -42; day < 0; day += 2) {
    if (day === -10 || day === -20) continue; // a few rest days
    const kind = session % 3;
    const round = Math.floor(session / 3);
    const items = plan[kind]!.map((item) => ({
      exerciseKey: item.exerciseKey,
      sets: item.sets.map((s, i) => {
        // Bench stalls after week 3; everything else progresses.
        const stalled = item.exerciseKey === "bench_press" && round >= 2;
        const weight = (s.weight ?? 0) + (stalled ? 5 : round * 2.5);
        const reps = Math.max(5, (s.reps ?? 8) + (round % 3) - (i === 2 ? 1 : 0) - (stalled ? Math.min(round - 2, 2) : 0));
        return { ...s, weight, reps };
      }),
    }));
    const date = addDays(today(), day);
    const id = actions.startWorkout(date, ids[kind] ?? null);
    actions.updateWorkout(id, { finished: true, note: session === 4 ? "Guter Pump heute" : null });
    actions.addItems(
      { id, date, startedAt: 0, finishedAt: null, note: null, templateId: null, sleep: null, energy: null, exercises: [] },
      items,
    );
    session++;
  }

  for (let day = -42; day <= 0; day += 3) {
    actions.setBodyWeight(addDays(today(), day), 82.4 - (day + 42) * 0.035 + Math.sin(day) * 0.4);
  }
};
