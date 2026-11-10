import { useMemo, useState } from "react";
import { getExercise, goalFor, type Goal } from "../domain/model";
import { repRange, suggestProgression } from "../domain/progression";
import { bodyWeightAt, exerciseSessions, records } from "../domain/stats";
import { formatDuration, formatNumber, toUnit } from "../domain/units";
import { Icon, LineChart, Segmented } from "../ui/components";
import { useApp } from "../ui/context";
import { equipmentName, formatDate, goalName, goalShort, muscleName } from "../ui/text";
import { parseDay } from "../domain/dates";
import { Sticker } from "../ui/stickers";
import { ExerciseLevelCard } from "../ui/StrengthLevel";
import { TipsList } from "../ui/Tips";

type ChartMetric = "e1rm" | "top" | "volume" | "reps" | "duration" | "distance";

export const ExerciseStats = ({ exerciseKey }: { exerciseKey: string }) => {
  const { t, data, lang, back, actions, exerciseName, weight, open } = useApp();
  const exercise = getExercise(data, exerciseKey);
  const sessions = useMemo(() => exerciseSessions(data, exerciseKey), [data, exerciseKey]);
  const best = useMemo(() => records(sessions), [sessions]);
  const unit = data.settings.unit;
  const isWeighted = exercise.metric === "weight" || (exercise.metric === "bodyweight" && best.maxWeight > 0);
  const isTimed = exercise.metric === "time" || exercise.metric === "cardio";
  const [metric, setMetric] = useState<ChartMetric>(isTimed ? "duration" : isWeighted ? "e1rm" : "reps");
  const goal = goalFor(data, exerciseKey);
  const ownGoal = data.exerciseGoals.get(exerciseKey) ?? null;
  const progression = suggestProgression(data, exerciseKey);
  const [min, max] = repRange[goal];

  const value = (s: (typeof sessions)[number]): number => {
    switch (metric) {
      case "e1rm":
        return toUnit(s.bestE1rm, unit);
      case "top":
        return toUnit(s.topWeight, unit);
      case "volume":
        return toUnit(s.volume, unit);
      case "reps":
        return s.maxReps;
      case "duration":
        return s.maxDuration;
      case "distance":
        return s.totalDistance / 1000;
    }
  };
  const points = sessions.map((s) => ({ x: parseDay(s.date).getTime(), y: value(s), label: formatDate(s.date, lang) }));
  const format = (y: number) =>
    metric === "duration"
      ? formatDuration(Math.round(y))
      : metric === "distance"
        ? `${formatNumber(y, lang, 2)} km`
        : metric === "reps"
          ? formatNumber(y, lang, 0)
          : `${formatNumber(y, lang, metric === "volume" ? 0 : 1)}`;

  const first = sessions[0];
  const last = sessions.at(-1);
  const change = first && last && first !== last && first.bestE1rm > 0 ? ((last.bestE1rm - first.bestE1rm) / first.bestE1rm) * 100 : null;
  const bw = last ? bodyWeightAt(data, last.date) : null;
  const relative = bw && best.bestE1rm > 0 ? best.bestE1rm / bw : null;

  const metricOptions: { value: ChartMetric; label: string }[] = isTimed
    ? [
        { value: "duration", label: t("Zeit", "Time") },
        ...(exercise.metric === "cardio" ? [{ value: "distance" as const, label: t("Strecke", "Distance") }] : []),
      ]
    : isWeighted
      ? [
          { value: "e1rm", label: "1RM" },
          { value: "top", label: t("Top", "Top") },
          { value: "volume", label: t("Volumen", "Volume") },
          { value: "reps", label: t("Wdh.", "Reps") },
        ]
      : [{ value: "reps", label: t("Wdh.", "Reps") }];

  return (
    <div className="screen overlay-screen">
      <header className="overlay-header">
        <button className="icon-button" onClick={back} aria-label={t("Zurück", "Back")}>
          <Icon name="back" />
        </button>
        <div className="overlay-title">
          <h1>{exerciseName(exercise)}</h1>
          <small>
            {equipmentName(exercise.equipment, lang)}
            {exercise.primary.length > 0 && ` · ${exercise.primary.map((m) => muscleName(m, lang)).join(", ")}`}
          </small>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="card muted-card">{t("Noch keine Daten für diese Übung.", "No data for this exercise yet.")}</div>
      ) : (
        <>
          <div className="stat-grid">
            {isWeighted && (
              <>
                <div className="stat-tile yellow">
                  <span>{t("Geschätztes 1RM", "Estimated 1RM")}</span>
                  <strong>{weight(best.bestE1rm)}</strong>
                </div>
                <div className="stat-tile pink">
                  <span>{t("Max. Gewicht", "Heaviest")}</span>
                  <strong>{weight(best.maxWeight)}</strong>
                </div>
                <div className="stat-tile lavender">
                  <span>{t("Bestes Volumen", "Best volume")}</span>
                  <strong>
                    {formatNumber(toUnit(best.bestVolume, unit), lang, 0)} {unit}
                  </strong>
                </div>
              </>
            )}
            {!isTimed && (
              <div className="stat-tile mint">
                <span>{t("Max. Wdh.", "Most reps")}</span>
                <strong>{best.maxReps}</strong>
              </div>
            )}
            {isTimed && (
              <div className="stat-tile yellow">
                <span>{t("Längste Zeit", "Longest")}</span>
                <strong>{formatDuration(best.maxDuration)}</strong>
              </div>
            )}
            {exercise.metric === "cardio" && (
              <div className="stat-tile pink">
                <span>{t("Weiteste Strecke", "Farthest")}</span>
                <strong>{formatNumber(best.maxDistance / 1000, lang, 2)} km</strong>
              </div>
            )}
            <div className="stat-tile sky">
              <span>{t("Einheiten", "Sessions")}</span>
              <strong>{sessions.length}</strong>
            </div>
            {change !== null && (
              <div className="stat-tile mint">
                <span>{t("Fortschritt 1RM", "1RM progress")}</span>
                <strong>
                  {change >= 0 ? "+" : ""}
                  {formatNumber(change, lang, 1)} %
                </strong>
              </div>
            )}
            {relative !== null && isWeighted && (
              <div className="stat-tile lavender">
                <span>{t("Relativ zum Körpergewicht", "Relative to bodyweight")}</span>
                <strong>{formatNumber(relative, lang, 2)} ×</strong>
              </div>
            )}
          </div>

          <ExerciseLevelCard exerciseKey={exerciseKey} />
          <TipsList exerciseKey={exerciseKey} card />

          <section className="card">
            <div className="section-row">
              <h2 className="card-title">{t("Verlauf", "Progress")}</h2>
            </div>
            {metricOptions.length > 1 && <Segmented value={metric} onChange={setMetric} options={metricOptions} />}
            <LineChart points={points} format={format} />
          </section>

          {progression && (
            <section className="card yellow-card">
              <h2 className="card-title with-sticker">
                <Sticker name="bulb" /> {t("Nächstes Mal", "Next time")}
              </h2>
              <p>
                {progression.sets
                  .map((s) => (isTimed ? formatDuration(s.duration ?? 0) : `${s.reps ?? "–"}${s.weight ? ` × ${weight(s.weight)}` : ""}`))
                  .join(" · ")}
              </p>
              <p className="hint">
                {t(
                  `Ziel ${goalName(goal, lang)}: ${min}–${max} Wdh. Schaffst du in allen Sätzen ${max}, geht das Gewicht hoch.`,
                  `Goal ${goalName(goal, lang)}: ${min}–${max} reps. Hit ${max} in every set and the weight goes up.`,
                )}
              </p>
            </section>
          )}

          {isWeighted && best.byReps.size > 0 && (
            <section className="card">
              <h2 className="card-title">{t("Bestwerte pro Wiederholungszahl", "Best weight per rep count")}</h2>
              <div className="rep-records">
                {[...best.byReps]
                  .sort((a, b) => a[0] - b[0])
                  .map(([reps, w]) => (
                    <div key={reps} className="rep-record">
                      <span>{reps}×</span>
                      <strong>{weight(w)}</strong>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </>
      )}

      {!isTimed && (
        <section className="card">
          <h2 className="card-title">{t("Trainingsziel für diese Übung", "Goal for this exercise")}</h2>
          <Segmented<Goal | "default">
            value={ownGoal ?? "default"}
            onChange={(v) => actions.setExerciseGoal(exerciseKey, v === "default" ? null : v)}
            options={[
              { value: "default", label: t("Global", "Default") },
              { value: "strength", label: goalShort("strength", lang) },
              { value: "hypertrophy", label: goalShort("hypertrophy", lang) },
              { value: "endurance", label: goalShort("endurance", lang) },
            ]}
          />
          {exercise.equipment === "egym" && !ownGoal && (
            <p className="hint">
              {t("Tipp: Für den EGYM-Standard mit 20 Wdh. passt „Kraftausdauer“.", "Tip: for EGYM’s standard 20 reps, choose “Endurance”.")}
            </p>
          )}
        </section>
      )}

      {sessions.length > 0 && (
        <section>
          <h2 className="section-title">{t("Einheiten", "Sessions")}</h2>
          <div className="stack">
            {[...sessions].reverse().map((s) => (
              <button key={s.workoutId} className="card list-card" onClick={() => open({ type: "workout", id: s.workoutId })}>
                <span className="list-main">
                  <strong>{formatDate(s.date, lang, "long")}</strong>
                  <small>
                    {s.sets
                      .map((x) =>
                        isTimed
                          ? formatDuration(x.duration ?? 0) + (x.distance ? ` · ${formatNumber(x.distance / 1000, lang, 2)} km` : "")
                          : `${x.reps ?? "–"}${x.weight ? ` × ${weight(x.weight)}` : ""}`,
                      )
                      .join(" · ")}
                  </small>
                  {s.note && (
                    <small className="note-line">
                      <Sticker name="note" size={16} /> {s.note}
                    </small>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
