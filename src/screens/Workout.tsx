import { useEffect, useRef, useState } from "react";
import { today } from "../domain/dates";
import { getExercise, defaultRest, type SetEntry, type TemplateItem, type TemplateSet, type Workout as WorkoutModel, type WorkoutExercise } from "../domain/model";
import { suggestProgression, type Progression } from "../domain/progression";
import { detectPrs, hasValue, type Pr } from "../domain/stats";
import { formatDuration, formatNumber, fromUnit, parseDuration, toUnit } from "../domain/units";
import { Icon, NumberField, Segmented, Sheet } from "../ui/components";
import { useApp, type App } from "../ui/context";
import { ExercisePicker } from "../ui/ExercisePicker";
import { useFeedback } from "../ui/feedback";
import { equipmentName, formatDate } from "../ui/text";
import { initialSets, templateItems, workoutToItems } from "../ui/workoutOps";
import { Sticker } from "../ui/stickers";

const DurationField = ({ value, onCommit, label }: { value: number | null; onCommit: (v: number | null) => void; label: string }) => {
  const [text, setText] = useState(value == null ? "" : formatDuration(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : formatDuration(value));
  }, [value]);
  return (
    <input
      className="num-input wide"
      inputMode="numeric"
      aria-label={label}
      placeholder="m:ss"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        const parsed = text.trim() === "" ? null : parseDuration(text);
        if (parsed === undefined || (text.trim() !== "" && parsed === null)) return setText(value == null ? "" : formatDuration(value));
        if (parsed !== value) onCommit(parsed);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
};

const describeSets = (app: App, sets: readonly TemplateSet[], metric: string): string => {
  const { t, lang, data } = app;
  if (sets.length === 0) return "";
  if (metric === "time" || metric === "cardio") return sets.map((s) => formatDuration(s.duration ?? 0) + (s.distance ? ` · ${formatNumber((s.distance ?? 0) / 1000, lang, 2)} km` : "")).join(", ");
  // Group identical sets: "3 × 10 @ 60 kg"
  const groups: { weight: number | null; reps: number | null; count: number }[] = [];
  for (const s of sets) {
    const last = groups.at(-1);
    if (last && last.weight === s.weight && last.reps === s.reps) last.count++;
    else groups.push({ weight: s.weight, reps: s.reps, count: 1 });
  }
  return groups
    .map((g) => `${g.count > 1 ? `${g.count} × ` : ""}${g.reps ?? "–"}${g.weight ? ` @ ${formatNumber(toUnit(g.weight, data.settings.unit), lang)} ${data.settings.unit}` : metric === "bodyweight" ? t(" Wdh.", " reps") : ""}`)
    .join(", ");
};

const progressionLabel = (app: App, p: Progression): string => {
  const { t } = app;
  switch (p.kind) {
    case "addWeight":
      return t("Mehr Gewicht", "Add weight");
    case "addReps":
      return t("Eine Wdh. mehr", "One more rep");
    case "deload":
      return t("Leichter (Deload)", "Lighter (deload)");
    case "addTime":
      return t("+5 Sekunden", "+5 seconds");
    case "repeat":
      return t("Wiederholen", "Repeat");
  }
};

const prMessage = (app: App, pr: Pr, exerciseName: string): string => {
  const { t, weight, lang } = app;
  switch (pr.kind) {
    case "weight":
      return t(`Neues Maximalgewicht: ${weight(pr.value)} bei ${exerciseName}!`, `New heaviest weight: ${weight(pr.value)} on ${exerciseName}!`);
    case "e1rm":
      return t(`Neues geschätztes 1RM: ${weight(pr.value)} bei ${exerciseName}!`, `New estimated 1RM: ${weight(pr.value)} on ${exerciseName}!`);
    case "reps":
      return t(`${pr.value} Wiederholungen – Rekord bei ${exerciseName}!`, `${pr.value} reps – a record on ${exerciseName}!`);
    case "duration":
      return t(`Neue Bestzeit: ${formatDuration(pr.value)} bei ${exerciseName}!`, `New best time: ${formatDuration(pr.value)} on ${exerciseName}!`);
    case "volume":
      return t(`Volumenrekord bei ${exerciseName}: ${formatNumber(toUnit(pr.value, app.data.settings.unit), lang, 0)} ${app.data.settings.unit}!`, `Volume record on ${exerciseName}: ${formatNumber(toUnit(pr.value, app.data.settings.unit), lang, 0)} ${app.data.settings.unit}!`);
  }
};

/**
 * Big −/+ buttons around a field: easier than the keyboard with sweaty hands.
 * They're left out of the tab order so Tab jumps from field to field on a
 * computer, where typing is faster anyway.
 */
const Stepper = ({ label, onStep, children }: { label: string; onStep: (direction: -1 | 1) => void; children: React.ReactNode }) => (
  <span className="stepper">
    <button className="step" tabIndex={-1} onClick={() => onStep(-1)} aria-label={`${label} −`}>
      −
    </button>
    {children}
    <button className="step" tabIndex={-1} onClick={() => onStep(1)} aria-label={`${label} +`}>
      +
    </button>
  </span>
);

/** Weight step per tap, by equipment and unit (EGYM adjusts in 1 kg steps). */
const weightStep = (equipment: string, unit: "kg" | "lb"): number => {
  if (unit === "lb") return equipment === "egym" || equipment === "dumbbell" ? 2.5 : 5;
  return equipment === "egym" || equipment === "dumbbell" || equipment === "other" ? 1 : 2.5;
};

/**
 * Keeps the screen on while a live workout is open. Browsers drop the lock
 * when the tab is hidden, so it is re-requested on return.
 */
const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {
          // Denied (e.g. battery saver): the app works fine without it.
        });
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, [active]);
};

const ExerciseBlock = ({ workout, entry, index, count }: { workout: WorkoutModel; entry: WorkoutExercise; index: number; count: number }) => {
  const app = useApp();
  const { t, data, actions, open, lang, exerciseName } = app;
  const { startRest, celebrate } = useFeedback();
  const exercise = getExercise(data, entry.exerciseKey);
  const unit = data.settings.unit;
  const progression = suggestProgression(data, entry.exerciseKey, workout.id);
  const [showNote, setShowNote] = useState(!!entry.note);
  const [menu, setMenu] = useState(false);
  // Values committed on blur aren't in `data` until Evolu's query refreshes.
  // Tapping ✓ right after typing must still see them (for PR detection).
  const pending = useRef(new Map<string, Partial<TemplateSet>>());

  const commit = (set: SetEntry, values: Partial<TemplateSet>) => {
    pending.current.set(set.id, { ...pending.current.get(set.id), ...values });
    actions.updateSet(set.id, values);
  };

  const current = (set: SetEntry): SetEntry => ({ ...set, ...pending.current.get(set.id) });

  const stepWeight = (set: SetEntry, direction: -1 | 1) => {
    const step = weightStep(exercise.equipment, unit);
    const value = toUnit(current(set).weight ?? 0, unit);
    const next = Math.max(0, Math.round((value + direction * step) / step) * step);
    commit(set, { weight: fromUnit(next, unit) });
  };
  const stepReps = (set: SetEntry, direction: -1 | 1) => commit(set, { reps: Math.max(0, (current(set).reps ?? 0) + direction) });
  const stepDuration = (set: SetEntry, direction: -1 | 1) => commit(set, { duration: Math.max(0, (current(set).duration ?? 0) + direction * 5) });

  const toggleDone = (set: SetEntry) => {
    const merged = current(set);
    actions.updateSet(set.id, { done: !set.done });
    // Rest timer and confetti only make sense live, not when backfilling.
    if (set.done || !hasValue(merged) || workout.date !== today()) return;
    const goal = data.exerciseGoals.get(entry.exerciseKey);
    startRest(goal ? defaultRest[goal] : data.settings.restSeconds);
    const prs = detectPrs(data, workout.id, merged);
    if (prs[0]) celebrate(prMessage(app, prs[0], exerciseName(exercise)));
  };

  const applyProgression = () => {
    if (!progression) return;
    progression.sets.forEach((values, i) => {
      const existing = entry.sets[i];
      if (existing && !existing.done) commit(existing, values);
      else if (!existing) actions.addSet(workout.id, entry.id, entry.exerciseKey, values, entry.sets.length + i);
    });
  };

  // Ticking sets off only matters live (rest timer, PRs, progress).
  // For backfilled workouts the column is just noise, so it's hidden.
  const live = workout.date === today();
  const weightLabel = exercise.metric === "bodyweight" ? `+${unit}` : unit;
  const showPlates = exercise.equipment === "barbell";

  return (
    <section className="card exercise-card">
      <div className="exercise-head">
        <button className="exercise-title" onClick={() => open({ type: "exercise", key: entry.exerciseKey })}>
          <strong>{exerciseName(exercise)}</strong>
          <small>
            {equipmentName(exercise.equipment, lang)} · {t("Statistik", "Stats")} ›
          </small>
        </button>
        {showPlates && (
          <button
            className="icon-button"
            onClick={() => open({ type: "plates", weight: Math.max(0, ...entry.sets.map((x) => x.weight ?? 0)) || undefined })}
            aria-label={t("Scheibenrechner", "Plate calculator")}
          >
            <Sticker name="plate" size={26} />
          </button>
        )}
        <button className="icon-button" onClick={() => setMenu(!menu)} aria-label={t("Mehr", "More")}>
          <Icon name="more" />
        </button>
      </div>
      {menu && (
        <div className="chips">
          <button className="chip" disabled={index === 0} onClick={() => actions.moveExercise(workout, entry.id, -1)}>
            <Icon name="up" size={16} /> {t("Hoch", "Up")}
          </button>
          <button className="chip" disabled={index === count - 1} onClick={() => actions.moveExercise(workout, entry.id, 1)}>
            <Icon name="down" size={16} /> {t("Runter", "Down")}
          </button>
          <button className="chip" onClick={() => setShowNote(true)}>
            <Icon name="note" size={16} /> {t("Notiz", "Note")}
          </button>
          <button className="chip danger" onClick={() => confirm(t("Übung aus diesem Training entfernen?", "Remove exercise from this workout?")) && actions.removeExercise(workout, entry.id)}>
            <Icon name="trash" size={16} /> {t("Entfernen", "Remove")}
          </button>
        </div>
      )}

      {progression && (
        <div className="progress-hint">
          <div>
            <small>{t("Letztes Mal", "Last time")} ({formatDate(progression.last.date, lang)})</small>
            <div>{describeSets(app, progression.last.sets, exercise.metric)}</div>
          </div>
          {progression.kind !== "repeat" && (
            <button className="suggest-chip" onClick={applyProgression}>
              <span className="with-sticker">
                <Sticker name="bulb" size={22} /> {progressionLabel(app, progression)}
              </span>
              <small>{describeSets(app, progression.sets, exercise.metric)}</small>
            </button>
          )}
        </div>
      )}

      <div className="set-table">
        <div className={`set-row set-header ${live ? "" : "no-check"}`}>
          <span>#</span>
          {(exercise.metric === "weight" || exercise.metric === "bodyweight") && (
            <>
              <span>{weightLabel}</span>
              <span>{t("Wdh.", "Reps")}</span>
            </>
          )}
          {exercise.metric === "time" && <span className="span2">{t("Zeit", "Time")}</span>}
          {exercise.metric === "cardio" && (
            <>
              <span>{t("Zeit", "Time")}</span>
              <span>km</span>
            </>
          )}
          {live && <span />}
          <span />
        </div>
        {entry.sets.map((set, i) => (
          <div key={set.id} className={`set-row ${set.done && live ? "done" : ""} ${live ? "" : "no-check"}`}>
            <span className="set-index">{i + 1}</span>
            {(exercise.metric === "weight" || exercise.metric === "bodyweight") && (
              <>
                <Stepper label={weightLabel} onStep={(d) => stepWeight(set, d)}>
                  <NumberField
                    label={weightLabel}
                    value={set.weight == null ? null : Math.round(toUnit(set.weight, unit) * 100) / 100}
                    placeholder={exercise.metric === "bodyweight" ? "0" : "–"}
                    onCommit={(v) => commit(set, { weight: v == null ? null : fromUnit(v, unit) })}
                  />
                </Stepper>
                <Stepper label={t("Wiederholungen", "Reps")} onStep={(d) => stepReps(set, d)}>
                  <NumberField label={t("Wiederholungen", "Reps")} value={set.reps} decimals={false} placeholder="–" onCommit={(v) => commit(set, { reps: v })} />
                </Stepper>
              </>
            )}
            {exercise.metric === "time" && (
              <span className="span2">
                <Stepper label={t("Zeit", "Time")} onStep={(d) => stepDuration(set, d)}>
                  <DurationField label={t("Zeit", "Time")} value={set.duration} onCommit={(v) => commit(set, { duration: v })} />
                </Stepper>
              </span>
            )}
            {exercise.metric === "cardio" && (
              <>
                <DurationField label={t("Zeit", "Time")} value={set.duration} onCommit={(v) => commit(set, { duration: v })} />
                <NumberField label="km" value={set.distance == null ? null : set.distance / 1000} placeholder="–" onCommit={(v) => commit(set, { distance: v == null ? null : v * 1000 })} />
              </>
            )}
            {live && (
              <button className={`check ${set.done ? "on" : ""}`} onClick={() => toggleDone(set)} aria-label={t("Satz erledigt", "Set done")}>
                <Icon name="check" size={18} />
              </button>
            )}
            <button className="mini-button ghost" tabIndex={-1} onClick={() => actions.removeSet(set.id)} aria-label={t("Satz löschen", "Delete set")}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="button small full" onClick={() => actions.addSet(workout.id, entry.id, entry.exerciseKey, entry.sets.at(-1), (entry.sets.at(-1)?.position ?? -1) + 1)}>
        <Icon name="plus" size={16} /> {t("Satz", "Set")}
      </button>
      {showNote && (
        <textarea
          className="text-input note"
          defaultValue={entry.note ?? ""}
          placeholder={t("Notiz zur Übung (z. B. Sitzhöhe 4)", "Exercise note (e.g. seat height 4)")}
          onBlur={(e) => e.target.value !== (entry.note ?? "") && actions.updateExerciseNote(entry.id, e.target.value)}
        />
      )}
    </section>
  );
};

/** Copy exercises from a template or an earlier workout. */
const CopySheet = ({ workout, onClose }: { workout: WorkoutModel; onClose: () => void }) => {
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
    actions.addItems(workout, selected.items.filter((_, i) => checked.has(i)));
    if (selected.templateId && !workout.templateId) actions.updateWorkout(workout.id, { templateId: selected.templateId });
    onClose();
  };

  const sources =
    source === "templates"
      ? data.templates.map((tpl) => ({ id: tpl.id, title: tpl.name, subtitle: `${tpl.items.length} ${t("Übungen", "exercises")}`, items: templateItems(data, tpl, workout.id), templateId: tpl.id }))
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
            ? t("Noch keine Vorlagen. Speichere ein Training als Vorlage oder lege in den Einstellungen den EGYM-Zirkel an.", "No templates yet. Save a workout as a template, or create the EGYM circuit in settings.")
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
                  {t(`${checked.size} Übungen übernehmen`, `Copy ${checked.size} exercises`)}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
};

const SaveTemplateSheet = ({ workout, onClose }: { workout: WorkoutModel; onClose: () => void }) => {
  const { t, data, actions } = useApp();
  const { toast } = useFeedback();
  const [name, setName] = useState("");
  return (
    <Sheet title={t("Als Vorlage speichern", "Save as template")} onClose={onClose}>
      <p className="hint">{t("Vorlagen sind deine Splits (z. B. Push, Pull, Beine). Ihre Reihenfolge bestimmt, was als Nächstes vorgeschlagen wird.", "Templates are your splits (e.g. push, pull, legs). Their order decides what’s suggested next.")}</p>
      <input className="text-input" autoFocus placeholder={t("Name, z. B. Push", "Name, e.g. Push")} value={name} onChange={(e) => setName(e.target.value)} />
      <button
        className="button dark full"
        disabled={!name.trim()}
        onClick={() => {
          const id = actions.saveTemplate(data, name, workoutToItems(workout));
          if (!workout.templateId) actions.updateWorkout(workout.id, { templateId: id });
          toast(t("Vorlage gespeichert", "Template saved"));
          onClose();
        }}
      >
        {t("Speichern", "Save")}
      </button>
    </Sheet>
  );
};

export const WorkoutScreen = ({ id }: { id: string }) => {
  const { t, data, actions, back, lang } = useApp();
  const [sheet, setSheet] = useState<"add" | "copy" | "template" | null>(null);
  const workout = data.workouts.find((w) => w.id === id);
  useWakeLock(workout?.date === today());

  if (!workout)
    return (
      <div className="screen overlay-screen">
        <header className="overlay-header">
          <button className="icon-button" onClick={back}>
            <Icon name="back" />
          </button>
        </header>
        <p className="hint">{t("Lädt …", "Loading …")}</p>
      </div>
    );

  const done = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const total = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const exclude = new Set(workout.exercises.map((e) => e.exerciseKey));

  return (
    <div className="screen overlay-screen">
      <header className="overlay-header">
        <button className="icon-button" onClick={back} aria-label={t("Zurück", "Back")}>
          <Icon name="back" />
        </button>
        <div className="overlay-title">
          <h1>{t("Training", "Workout")}</h1>
          <label className="date-pill">
            {formatDate(workout.date, lang, "long")}
            <input type="date" value={workout.date} onChange={(e) => e.target.value && actions.updateWorkout(workout.id, { date: e.target.value })} />
          </label>
        </div>
        {total > 0 && workout.date === today() && (
          <span className="progress-pill">
            {done}/{total}
          </span>
        )}
      </header>

      {workout.exercises.length === 0 && (
        <div className="card hero empty-workout">
          {workout.date === today() ? (
            <>
              <h2>{t("Was steht heute an?", "What’s on today?")}</h2>
              <p>{t("Füge Übungen hinzu oder übernimm eine Vorlage bzw. ein früheres Training.", "Add exercises, or copy a template or past workout.")}</p>
            </>
          ) : (
            <>
              <h2>{t("Was hast du gemacht?", "What did you do?")}</h2>
              <p>{t("Trag die Übungen nach – oder übernimm ein ähnliches Training und pass die Werte an.", "Add the exercises – or copy a similar workout and adjust the numbers.")}</p>
            </>
          )}
        </div>
      )}

      <div className="stack">
        {workout.exercises.map((e, i) => (
          <ExerciseBlock key={e.id} workout={workout} entry={e} index={i} count={workout.exercises.length} />
        ))}
      </div>

      <div className="action-grid">
        <button className="button dark" onClick={() => setSheet("add")}>
          <Icon name="plus" /> {t("Übung", "Exercise")}
        </button>
        <button className="button yellow" onClick={() => setSheet("copy")}>
          <Icon name="copy" /> {t("Übernehmen", "Copy from")}
        </button>
      </div>

      <textarea
        className="text-input note"
        defaultValue={workout.note ?? ""}
        placeholder={t("Kommentar zum Training (wie lief’s?)", "Workout comment (how did it go?)")}
        onBlur={(e) => e.target.value !== (workout.note ?? "") && actions.updateWorkout(workout.id, { note: e.target.value })}
      />

      <div className="action-grid">
        <button className="button" disabled={workout.exercises.length === 0} onClick={() => setSheet("template")}>
          <Icon name="bookmark" /> {t("Als Vorlage", "Save template")}
        </button>
        <button
          className="button pink"
          onClick={() => {
            actions.updateWorkout(workout.id, { finished: true });
            back();
          }}
        >
          <Icon name="check" /> {t("Fertig", "Done")}
        </button>
      </div>
      <button
        className="link danger center"
        onClick={() => {
          if (!confirm(t("Dieses Training wirklich löschen?", "Delete this workout?"))) return;
          actions.deleteWorkout(workout);
          back();
        }}
      >
        {t("Training löschen", "Delete workout")}
      </button>

      {sheet === "add" && (
        <ExercisePicker
          exclude={exclude}
          onClose={() => setSheet(null)}
          onPick={(key) => {
            actions.addExercise(workout, key, initialSets(data, key, workout.id));
            setSheet(null);
          }}
        />
      )}
      {sheet === "copy" && <CopySheet workout={workout} onClose={() => setSheet(null)} />}
      {sheet === "template" && <SaveTemplateSheet workout={workout} onClose={() => setSheet(null)} />}
    </div>
  );
};
