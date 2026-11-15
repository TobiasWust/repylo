import { useMemo } from "react";
import { insightKinds } from "../../domain/insights";
import { getExercise } from "../../domain/model";
import { allSuggestions } from "../../domain/suggestions";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";
import { cardSticker, suggestionText, whyText } from "../../ui/suggestionText";

/**
 * Everything the coach currently notices about your training, with the
 * research behind it. Home shows only the top hint; this lists them all,
 * including ones swiped away there.
 */
export const CoachCard = () => {
  const app = useApp();
  const { t, data, exerciseName } = app;
  const insights = useMemo(() => allSuggestions({ ...data, dismissedUntil: new Map() }).filter((s) => insightKinds.has(s.kind)), [data]);
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="bulb" /> {t("Coach", "Coach")}
      </h2>
      {insights.length === 0 ? (
        <p className="hint">
          {t(
            "Gerade nichts zu verbessern – Volumen, Übungsauswahl und Intensität passen.",
            "Nothing to improve right now – volume, exercise choice and intensity look good.",
          )}
        </p>
      ) : (
        <div className="coach-list">
          {insights.map((s) => {
            const { title, text } = suggestionText(s, app);
            const why = whyText(s, app);
            return (
              <div key={s.key} className="coach-item">
                <span className="sticker-cell">
                  <Sticker name={cardSticker[s.kind]} size={28} />
                </span>
                <strong>{title}</strong>
                <p>
                  {text}
                  {s.exerciseKeys.length > 0 &&
                    ` ${s.kind === "similar" ? "" : t("Z. B.: ", "E.g.: ")}${s.exerciseKeys.map((k) => exerciseName(getExercise(data, k))).join(", ")}`}
                </p>
                {why && (
                  <details className="why">
                    <summary>{t("Warum?", "Why?")}</summary>
                    <p>{why}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
