import { useEffect, useState } from "react";
import { getExercise } from "../../domain/model";
import { coachTip, coachTipDismissDays } from "../../domain/suggestions";
import { workoutSummary } from "../../domain/coach";
import { formatNumber } from "../../domain/units";
import { Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";
import { cardColors, cardSticker, suggestionText, whyText } from "../../ui/suggestionText";

/** Shown after "Done": what was achieved and what comes next. */
export const SummarySheet = ({ workoutId, onClose }: { workoutId: string; onClose: () => void }) => {
  const app = useApp();
  const { t, data, actions, lang, weight, exerciseName } = app;
  const summary = workoutSummary(data, workoutId);
  // One tip per workout, fixed while the sheet is open. Once shown it rests
  // for two weeks, so the next workout brings the next most important one.
  const [tip] = useState(() => coachTip(data));
  useEffect(() => {
    if (tip) actions.dismiss(tip.key, coachTipDismissDays);
  }, [tip, actions]);
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
        <div className="coach-line positive shine">
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
      {tip && (
        <div className="coach-tip" style={{ background: cardColors[tip.kind] }}>
          <div className="coach-tip-head">
            <Sticker name={cardSticker[tip.kind]} size={30} />
            <span>
              <small>{t("Tipp fürs nächste Mal", "Tip for next time")}</small>
              <strong>{suggestionText(tip, app).title}</strong>
            </span>
          </div>
          <p>
            {suggestionText(tip, app).text}
            {tip.exerciseKeys.length > 0 && ` ${tip.exerciseKeys.map((k) => exerciseName(getExercise(data, k))).join(", ")}`}
          </p>
          {whyText(tip, app) && (
            <details className="why">
              <summary>{t("Warum?", "Why?")}</summary>
              <p>{whyText(tip, app)}</p>
            </details>
          )}
        </div>
      )}
      <button className="button dark big full" onClick={onClose}>
        {t("Weiter so!", "Keep it up!")}
      </button>
    </Sheet>
  );
};
