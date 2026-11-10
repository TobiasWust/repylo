import { getExercise } from "../../domain/model";
import { workoutSummary } from "../../domain/coach";
import { formatNumber } from "../../domain/units";
import { Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";

/** Shown after "Done": what was achieved and what comes next. */
export const SummarySheet = ({ workoutId, onClose }: { workoutId: string; onClose: () => void }) => {
  const { t, data, lang, weight, exerciseName } = useApp();
  const summary = workoutSummary(data, workoutId);
  if (!summary) return null;
  const goalReached = summary.daysThisWeek >= summary.weeklyGoal;
  const headline =
    summary.records.length > 0
      ? t("Rekord-Training!", "Record workout!")
      : summary.gains.length > 0
        ? t("Stärker als letztes Mal!", "Stronger than last time!")
        : t("Training geschafft!", "Workout done!");
  return (
    <Sheet title={headline} onClose={onClose}>
      <div className="stat-grid">
        <div className="stat-tile yellow">
          <span>{t("Sätze", "Sets")}</span>
          <strong>{summary.sets}</strong>
        </div>
        <div className="stat-tile lavender">
          <span>{t("Bewegt", "Lifted")}</span>
          <strong>{weight(summary.volume)}</strong>
        </div>
        {summary.minutes !== null && (
          <div className="stat-tile mint">
            <span>{t("Dauer", "Duration")}</span>
            <strong>{summary.minutes} min</strong>
          </div>
        )}
        <div className={`stat-tile ${goalReached ? "mint" : "pink"}`}>
          <span>{t("Wochenziel", "Weekly goal")}</span>
          <strong>
            {summary.daysThisWeek} / {summary.weeklyGoal}
          </strong>
        </div>
      </div>
      {summary.records.length > 0 && (
        <div className="coach-line positive">
          <Sticker name="trophy" size={28} />
          <span>
            {t("Neue Bestwerte: ", "New bests: ")}
            <strong>{summary.records.map((k) => exerciseName(getExercise(data, k))).join(", ")}</strong>
          </span>
        </div>
      )}
      {summary.gains.length > 0 && (
        <div className="stack tight">
          {summary.gains.map((g) => (
            <div key={g.exerciseKey} className="coach-line">
              <Sticker name="chartUp" size={24} />
              <span>
                {exerciseName(getExercise(data, g.exerciseKey))}: <strong>+{formatNumber(g.percent, lang, 1)} %</strong>{" "}
                {t("gegenüber letztem Mal", "vs. last time")}
              </span>
            </div>
          ))}
        </div>
      )}
      {(summary.nextTemplate || !goalReached) && (
        <div className="coach-line">
          <Sticker name="calendar" size={26} />
          <span>
            {summary.nextTemplate && t(`Als Nächstes: ${summary.nextTemplate}. `, `Up next: ${summary.nextTemplate}. `)}
            {!goalReached &&
              t(
                `Noch ${summary.weeklyGoal - summary.daysThisWeek} Training${summary.weeklyGoal - summary.daysThisWeek === 1 ? "" : "s"} bis zum Wochenziel.`,
                `${summary.weeklyGoal - summary.daysThisWeek} more to reach your weekly goal.`,
              )}
          </span>
        </div>
      )}
      <button className="button dark big full" onClick={onClose}>
        {t("Weiter so!", "Keep it up!")}
      </button>
    </Sheet>
  );
};
