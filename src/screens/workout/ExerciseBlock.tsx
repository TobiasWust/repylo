import { useRef, useState } from "react";
import { today } from "../../domain/dates";
import { getExercise, defaultRest, type SetEntry, type TemplateSet, type Workout as WorkoutModel, type WorkoutExercise } from "../../domain/model";
import { suggestProgression } from "../../domain/progression";
import { detectPrs, hasValue } from "../../domain/stats";
import { setFeedback } from "../../domain/coach";
import { tipsFor } from "../../domain/tips";
import { estimateStart } from "../../domain/estimate";
import { TipsList } from "../../ui/Tips";
import { fromUnit, toUnit } from "../../domain/units";
import { Icon, NumberField } from "../../ui/components";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { equipmentName, formatDate } from "../../ui/text";
import { Sticker } from "../../ui/stickers";
import { describeSets, prMessage, progressionLabel } from "./format";
import { DurationField, Stepper, weightStep } from "./SetInputs";
import { CoachLine } from "./CoachLine";

export const ExerciseBlock = ({ workout, entry, index, count }: { workout: WorkoutModel; entry: WorkoutExercise; index: number; count: number }) => {
  const app = useApp();
  const { t, data, actions, open, lang, exerciseName } = app;
  const { startRest, celebrate } = useFeedback();
  const exercise = getExercise(data, entry.exerciseKey);
  const unit = data.settings.unit;
  const progression = suggestProgression(data, entry.exerciseKey, workout.id);
  const feedback = setFeedback(data, workout.id, entry.exerciseKey, entry.sets);
  const estimate = progression ? null : estimateStart(data, entry.exerciseKey);
  const [showNote, setShowNote] = useState(!!entry.note);
  const [menu, setMenu] = useState(false);
  const [showTips, setShowTips] = useState(false);
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
          {tipsFor(entry.exerciseKey, lang) && (
            <button className={`chip ${showTips ? "selected" : ""}`} onClick={() => setShowTips(!showTips)}>
              <Sticker name="bulb" size={16} /> {t("Tipps", "Tips")}
            </button>
          )}
          <button className="chip" onClick={() => setShowNote(true)}>
            <Icon name="note" size={16} /> {t("Notiz", "Note")}
          </button>
          <button className="chip danger" onClick={() => confirm(t("Übung aus diesem Training entfernen?", "Remove exercise from this workout?")) && actions.removeExercise(workout, entry.id)}>
            <Icon name="trash" size={16} /> {t("Entfernen", "Remove")}
          </button>
        </div>
      )}

      {showTips && <TipsList exerciseKey={entry.exerciseKey} />}

      {!progression && estimate && (
        <div className="progress-hint">
          <div>
            <small>{t("Neu für dich", "New for you")}</small>
            <div>
              {estimate.basedOn.length > 0
                ? t(
                    `Startwerte geschätzt aus deiner Kraft bei ${estimate.basedOn.map((k) => exerciseName(getExercise(data, k))).join(" und ")}.`,
                    `Starting values estimated from your strength on ${estimate.basedOn.map((k) => exerciseName(getExercise(data, k))).join(" and ")}.`,
                  )
                : t("Startwerte geschätzt aus Durchschnittswerten.", "Starting values estimated from average values.")}{" "}
              {t("Lieber etwas leichter anfangen und dann steigern.", "Better start a bit lighter and build up.")}
            </div>
          </div>
          {entry.sets.every((s) => s.weight == null && !s.done) && estimate.sets[0]?.weight != null && (
            <button className="suggest-chip" onClick={() => estimate.sets.forEach((values, i) => entry.sets[i] && commit(entry.sets[i]!, values))}>
              <span className="with-sticker">
                <Sticker name="bulb" size={22} /> {t("Schätzung übernehmen", "Use estimate")}
              </span>
              <small>{describeSets(app, estimate.sets, exercise.metric)}</small>
            </button>
          )}
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
        <div className="set-row set-header">
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
          <span />
          <span />
        </div>
        {entry.sets.map((set, i) => (
          <div key={set.id} className={`set-row ${set.done ? "done" : ""}`}>
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
            <button className={`check ${set.done ? "on" : ""}`} onClick={() => toggleDone(set)} aria-label={t("Satz erledigt", "Set done")}>
              <Icon name="check" size={18} />
            </button>
            <button className="mini-button ghost" tabIndex={-1} onClick={() => actions.removeSet(set.id)} aria-label={t("Satz löschen", "Delete set")}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
      {feedback && <CoachLine feedback={feedback} metric={exercise.metric} />}
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
