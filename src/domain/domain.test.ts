import { describe, expect, it } from "vitest";
import { addDays, today, weekStart } from "./dates";
import { buildData, type Data, type Rows } from "./model";
import { calculatePlates } from "./plates";
import { monthlyReview } from "./review";
import { rate } from "./standards";
import { suggestProgression } from "./progression";
import { detectPrs, e1rm, exerciseSessions, records, setsPerMuscle, weekStreak } from "./stats";
import { computeSuggestions, recoveringMuscles } from "./suggestions";

// --- Tiny builder for test histories -------------------------------------

type SetSpec = [weight: number | null, reps: number];
interface WorkoutSpec {
  daysAgo: number;
  templateId?: string;
  exercises: Record<string, SetSpec[]>;
}

const build = (workouts: WorkoutSpec[], extra: Partial<Rows> = {}): Data => {
  const rows: Rows = {
    workouts: [],
    workoutExercises: [],
    sets: [],
    templates: [],
    customExercises: [],
    bodyWeights: [],
    settings: [{ goal: "hypertrophy", unit: "kg", language: "de", restSeconds: 90, barWeight: 20, weeklyGoal: 1, standards: "male" }],
    exerciseSettings: [],
    dismissals: [],
    ...extra,
  };
  const w = rows.workouts as unknown[], we = rows.workoutExercises as unknown[], s = rows.sets as unknown[];
  workouts.forEach((spec, wi) => {
    const workoutId = `w${wi}`;
    w.push({ id: workoutId, date: addDays(today(), -spec.daysAgo), startedAt: wi, finishedAt: null, note: null, templateId: spec.templateId ?? null });
    Object.entries(spec.exercises).forEach(([key, sets], ei) => {
      const exId = `${workoutId}e${ei}`;
      we.push({ id: exId, workoutId, exerciseKey: key, position: ei, note: null });
      sets.forEach(([weight, reps], si) =>
        s.push({ id: `${exId}s${si}`, workoutId, workoutExerciseId: exId, exerciseKey: key, position: si, weight, reps, duration: null, distance: null, done: 1 }),
      );
    });
  });
  return buildData(rows);
};

const template = (id: string, name: string, position: number, keys: string[]) => ({
  id,
  name,
  position,
  items: JSON.stringify(keys.map((exerciseKey) => ({ exerciseKey, sets: [] }))),
});

// --- Stats ----------------------------------------------------------------

describe("stats", () => {
  it("estimates 1RM with Epley and treats single reps as the weight itself", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.3, 1);
    expect(e1rm(100, 20)).toBe(e1rm(100, 12)); // clamped
  });

  it("keeps only real rep records", () => {
    const data = build([{ daysAgo: 3, exercises: { bench_press: [[65, 10], [65, 8], [70, 5]] } }]);
    const best = records(exerciseSessions(data, "bench_press"));
    expect([...best.byReps]).toEqual([[10, 65], [5, 70]]);
  });

  it("counts secondary muscles as half sets", () => {
    const data = build([{ daysAgo: 0, exercises: { bench_press: [[60, 8], [60, 8]] } }]);
    const sets = setsPerMuscle(data, addDays(today(), -6));
    expect(sets.get("chest")).toBe(2);
    expect(sets.get("triceps")).toBe(1);
  });

  it("counts week streaks without breaking on the current, still open week", () => {
    const thisMonday = weekStart(today());
    const days = new Set([addDays(thisMonday, -7), addDays(thisMonday, -14)]);
    expect(weekStreak(days)).toBe(2);
  });

  it("only counts weeks that reach the weekly goal", () => {
    const monday = weekStart(today());
    const days = new Set([addDays(monday, -7), addDays(monday, -6), addDays(monday, -14)]);
    expect(weekStreak(days, 2)).toBe(1);
    expect(weekStreak(days, 1)).toBe(2);
  });

  it("detects PRs only when there is history to beat", () => {
    const first = build([{ daysAgo: 0, exercises: { squat: [[100, 5]] } }]);
    const set = first.workouts[0]!.exercises[0]!.sets[0]!;
    expect(detectPrs(first, first.workouts[0]!.id, set)).toEqual([]);

    const data = build([
      { daysAgo: 0, exercises: { squat: [[105, 5]] } },
      { daysAgo: 3, exercises: { squat: [[100, 5]] } },
    ]);
    const today0 = data.workouts[0]!;
    expect(detectPrs(data, today0.id, today0.exercises[0]!.sets[0]!)[0]?.kind).toBe("weight");
  });
});

describe("backfilled workouts", () => {
  const data = build([
    { daysAgo: 1, exercises: { squat: [[110, 5]] } },
    { daysAgo: 10, exercises: { squat: [[100, 5]] } }, // being backfilled
    { daysAgo: 20, exercises: { squat: [[90, 5]] } },
  ]);
  const backfilled = data.workouts[1]!;

  it("only sees sessions before the workout as history", () => {
    expect(exerciseSessions(data, "squat", backfilled.id).map((s) => s.topWeight)).toEqual([90]);
  });

  it("bases progression on what came before, not after", () => {
    expect(suggestProgression(data, "squat", backfilled.id)!.last.topWeight).toBe(90);
  });

  it("judges PRs against the past at that time", () => {
    expect(detectPrs(data, backfilled.id, backfilled.exercises[0]!.sets[0]!)[0]?.kind).toBe("weight");
  });
});

// --- Progression ------------------------------------------------------------

describe("progression (double progression)", () => {
  it("adds reps while below the top of the range", () => {
    const data = build([{ daysAgo: 2, exercises: { bench_press: [[60, 10], [60, 9], [60, 8]] } }]);
    const p = suggestProgression(data, "bench_press")!;
    expect(p.kind).toBe("addReps");
    expect(p.sets.map((s) => s.reps)).toEqual([11, 10, 9]);
    expect(p.sets.every((s) => s.weight === 60)).toBe(true);
  });

  it("adds the equipment increment once every set hits the top", () => {
    const data = build([{ daysAgo: 2, exercises: { bench_press: [[60, 12], [60, 12], [60, 12]] } }]);
    const p = suggestProgression(data, "bench_press")!;
    expect(p.kind).toBe("addWeight");
    expect(p.sets.every((s) => s.weight === 62.5 && s.reps === 8)).toBe(true);
  });

  it("uses 1 kg steps on EGYM machines and the exercise's own goal", () => {
    const data = build([{ daysAgo: 2, exercises: { egym_chest_press: [[21, 20], [21, 20], [21, 20]] } }], {
      exerciseSettings: [{ exerciseKey: "egym_chest_press", goal: "endurance" }],
    });
    const p = suggestProgression(data, "egym_chest_press")!;
    expect(p.kind).toBe("addWeight");
    expect(p.sets[0]).toMatchObject({ weight: 22, reps: 15 });
  });

  it("suggests a deload after two sessions below the range", () => {
    const data = build([
      { daysAgo: 2, exercises: { squat: [[100, 6], [100, 5]] } },
      { daysAgo: 5, exercises: { squat: [[100, 7], [100, 6]] } },
    ]);
    const p = suggestProgression(data, "squat")!;
    expect(p.kind).toBe("deload");
    expect(p.sets[0]!.weight).toBe(90);
  });
});

// --- Suggestions --------------------------------------------------------------

describe("suggestions", () => {
  it("knows which split comes next", () => {
    const data = build([{ daysAgo: 2, templateId: "t1", exercises: { bench_press: [[60, 8]] } }], {
      templates: [template("t1", "Push", 0, ["bench_press"]), template("t2", "Pull", 1, ["lat_pulldown"])],
    });
    const split = computeSuggestions(data).find((s) => s.kind === "split");
    expect(split?.params.name).toBe("Pull");
    expect(split?.exerciseKeys).toEqual(["lat_pulldown"]);
  });

  it("wraps around to the first split", () => {
    const data = build([{ daysAgo: 2, templateId: "t2", exercises: { lat_pulldown: [[50, 8]] } }], {
      templates: [template("t1", "Push", 0, ["bench_press"]), template("t2", "Pull", 1, ["lat_pulldown"])],
    });
    expect(computeSuggestions(data).find((s) => s.kind === "split")?.params.name).toBe("Push");
  });

  it("does not suggest muscles that were trained hard in the last 48 h", () => {
    const data = build([
      { daysAgo: 0, exercises: { squat: [[100, 5], [100, 5], [100, 5]] } },
      { daysAgo: 6, exercises: { bench_press: [[60, 8]] } },
      { daysAgo: 12, exercises: { bench_press: [[60, 8]] } },
    ]);
    expect(recoveringMuscles(data, today()).has("quads")).toBe(true);
    const keys = computeSuggestions(data).flatMap((s) => s.exerciseKeys);
    expect(keys).not.toContain("squat");
    expect(keys).not.toContain("leg_press");
  });

  it("flags neglected muscle groups", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: [[60, 8], [60, 8], [60, 8]] } },
      { daysAgo: 5, exercises: { bench_press: [[60, 8], [60, 8], [60, 8]] } },
      { daysAgo: 12, exercises: { bench_press: [[60, 8], [60, 8], [60, 8]] } },
    ]);
    const neglected = computeSuggestions(data).filter((s) => s.kind === "neglected");
    expect(neglected.length).toBeGreaterThan(0);
    expect(neglected.map((s) => s.params.muscle)).not.toContain("chest");
  });

  it("brings back exercises that used to be regular", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: [[60, 8]] } },
      { daysAgo: 25, exercises: { squat: [[100, 5]] } },
      { daysAgo: 32, exercises: { squat: [[100, 5]] } },
      { daysAgo: 39, exercises: { squat: [[100, 5]] } },
    ]);
    const missing = computeSuggestions(data).find((s) => s.kind === "missing");
    expect(missing?.exerciseKeys).toContain("squat");
  });

  it("detects a plateau and proposes a variant", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: [[65, 7]] } },
      { daysAgo: 8, exercises: { bench_press: [[65, 7]] } },
      { daysAgo: 15, exercises: { bench_press: [[65, 8]] } },
      { daysAgo: 35, exercises: { bench_press: [[65, 10]] } },
      { daysAgo: 42, exercises: { bench_press: [[60, 8]] } },
    ]);
    const plateau = computeSuggestions(data).find((s) => s.kind === "plateau");
    expect(plateau?.params.exercise).toBe("bench_press");
    expect(plateau?.exerciseKeys).toEqual(["db_bench_press"]);
  });

  it("hides dismissed suggestions until the dismissal expires", () => {
    const rows = { templates: [template("t1", "Push", 0, ["bench_press"]), template("t2", "Pull", 1, ["lat_pulldown"])] };
    const visible = computeSuggestions(build([], rows)).find((s) => s.kind === "split")!;
    const dismissed = build([], { ...rows, dismissals: [{ key: visible.key, until: Date.now() + 1000 }] });
    expect(computeSuggestions(dismissed).some((s) => s.key === visible.key)).toBe(false);
  });
});

describe("plates", () => {
  it("loads plates per side, heaviest first", () => {
    expect(calculatePlates(100, 20, "kg").perSide).toEqual([25, 15]);
    expect(calculatePlates(62.5, 20, "kg").perSide).toEqual([20, 1.25]);
    expect(calculatePlates(225, 45, "lb").perSide).toEqual([45, 45]);
  });

  it("reports what can't be loaded exactly", () => {
    expect(calculatePlates(21, 20, "kg").remainder).toBe(0.5);
  });
});

describe("strength standards", () => {
  it("places a lift on the level scale", () => {
    const r = rate("bench_press", 1.2, "male")!;
    expect(r.level).toBe("intermediate");
    expect(r.nextRatio).toBe(1.5);
    expect(r.progress).toBeCloseTo(0.4);
    expect(rate("bench_press", 1.2, "female")!.level).toBe("advanced");
    expect(rate("leg_press", 3, "male")).toBeNull();
  });
});

describe("monthly review", () => {
  it("summarises a month and finds the biggest gain", () => {
    const thisMonth = today().slice(0, 7);
    const data = build([
      { daysAgo: 0, exercises: { squat: [[110, 5], [110, 5]] } },
      { daysAgo: 40, exercises: { squat: [[100, 5]] } },
    ]);
    const review = monthlyReview(data, thisMonth);
    expect(review.workouts).toBe(1);
    expect(review.sets).toBe(2);
    expect(review.volume).toBe(1100);
    expect(review.favorite?.exerciseKey).toBe("squat");
    expect(review.biggestGain?.percent).toBeCloseTo(10);
    expect(review.records).toBe(1);
  });
});
