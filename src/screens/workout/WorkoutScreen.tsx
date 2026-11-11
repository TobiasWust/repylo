import { useState } from "react";
import { today } from "../../domain/dates";
import { hasValue } from "../../domain/stats";
import { Icon } from "../../ui/components";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { ExercisePicker } from "../../ui/ExercisePicker";
import { formatDate } from "../../ui/text";
import { initialSets } from "../../ui/workoutOps";
import { DatePill } from "../../ui/DateField";
import { useWakeLock } from "./useWakeLock";
import { ExerciseBlock } from "./ExerciseBlock";
import { CopySheet } from "./CopySheet";
import { SaveTemplateSheet } from "./SaveTemplateSheet";
import { Readiness } from "./Readiness";
import { SummarySheet } from "./SummarySheet";

export const WorkoutScreen = ({ id }: { id: string }) => {
  const { t, data, actions, back, lang } = useApp();
  const { confirm } = useFeedback();
  const [sheet, setSheet] = useState<"add" | "copy" | "template" | "summary" | null>(null);
  const workout = data.workouts.find((w) => w.id === id);
  useWakeLock(workout?.date === today());
  // Exercises there when the screen opened (null while still loading); later ones slide in.
  const [initialExercises] = useState(() => (workout ? new Set(workout.exercises.map((e) => e.id)) : null));
  // The progress counter bumps when it changes, not when the screen opens.
  const doneCount = workout?.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) ?? 0;
  const [openedWith] = useState(doneCount);

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
          <DatePill value={workout.date} onChange={(date) => actions.updateWorkout(workout.id, { date })}>
            {formatDate(workout.date, lang, "long")}
          </DatePill>
        </div>
        {total > 0 && (
          <span
            key={done}
            className={["progress-pill", done !== openedWith && "bump", done === total && "complete"].filter(Boolean).join(" ")}
          >
            {done}/{total}
          </span>
        )}
      </header>

      <Readiness workout={workout} />

      {workout.exercises.length === 0 && (
        <div className="card hero empty-workout">
          {workout.date === today() ? (
            <>
              <h2>{t("Was steht heute an?", "What’s on today?")}</h2>
              <p>
                {t(
                  "Füge Übungen hinzu oder übernimm eine Vorlage bzw. ein früheres Training.",
                  "Add exercises, or copy a template or past workout.",
                )}
              </p>
            </>
          ) : (
            <>
              <h2>{t("Was hast du gemacht?", "What did you do?")}</h2>
              <p>
                {t(
                  "Trag die Übungen nach – oder übernimm ein ähnliches Training und pass die Werte an.",
                  "Add the exercises – or copy a similar workout and adjust the numbers.",
                )}
              </p>
            </>
          )}
        </div>
      )}

      <div className="stack">
        {workout.exercises.map((e, i) => (
          <ExerciseBlock
            key={e.id}
            workout={workout}
            entry={e}
            index={i}
            count={workout.exercises.length}
            added={initialExercises !== null && !initialExercises.has(e.id)}
          />
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
            // An empty workout has nothing to summarise.
            if (workout.exercises.some((e) => e.sets.some(hasValue))) setSheet("summary");
            else back();
          }}
        >
          <Icon name="check" /> {t("Fertig", "Done")}
        </button>
      </div>
      <button
        className="link danger center"
        onClick={async () => {
          const ok = await confirm({
            title: t("Dieses Training löschen?", "Delete this workout?"),
            message: t("Alle Sätze darin sind dann weg.", "All its sets will be gone."),
            confirmLabel: t("Löschen", "Delete"),
            danger: true,
          });
          if (!ok) return;
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
      {sheet === "summary" && (
        <SummarySheet
          workoutId={workout.id}
          onClose={() => {
            setSheet(null);
            back();
          }}
        />
      )}
    </div>
  );
};
