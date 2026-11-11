import { bodyWeightAt } from "../domain/stats";
import { levels, rateExercise, ratedExercises, type Level, type Rating } from "../domain/standards";
import { today } from "../domain/dates";
import { formatNumber } from "../domain/units";
import { Segmented } from "./components";
import { useApp } from "./context";
import { Sticker } from "./stickers";

const levelNames: Record<Level, [string, string]> = {
  beginner: ["Neu", "New"],
  novice: ["Basis", "Novice"],
  intermediate: ["Solide", "Solid"],
  advanced: ["Stark", "Strong"],
  elite: ["Elite", "Elite"],
};
const levelColors = ["var(--sky)", "var(--mint)", "var(--yellow)", "var(--pink)", "var(--lavender)"];

/** Five-segment bar with a marker for where the lifter stands. */
const LevelBar = ({ rating }: { rating: Rating }) => {
  const { lang } = useApp();
  const index = levels.indexOf(rating.level);
  const position = ((index + rating.progress) / levels.length) * 100;
  return (
    <div className="level">
      <div className="level-bar">
        {levels.map((l, i) => (
          <span key={l} style={{ background: i <= index ? levelColors[i] : "var(--soft)" }} />
        ))}
        <i className="level-marker" style={{ left: `${Math.min(97, Math.max(3, position))}%` }} />
      </div>
      <div className="level-labels">
        {levels.map((l) => (
          <small key={l} className={l === rating.level ? "active" : ""}>
            {levelNames[l][lang === "de" ? 0 : 1]}
          </small>
        ))}
      </div>
    </div>
  );
};

const levelName = (level: Level, lang: "de" | "en") => levelNames[level][lang === "de" ? 0 : 1];

/** Asks once which standards to use (they differ a lot between men and women). */
const StandardsPicker = () => {
  const { t, actions } = useApp();
  return (
    <div className="stack tight">
      <p className="hint">
        {t("Mit welchen Richtwerten möchtest du dich vergleichen?", "Which standards do you want to compare against?")}
      </p>
      <Segmented
        value={"" as "male" | "female" | ""}
        onChange={(v) => v && actions.updateSettings({ standards: v })}
        options={[
          { value: "male", label: t("Männer", "Men") },
          { value: "female", label: t("Frauen", "Women") },
        ]}
      />
    </div>
  );
};

/** Card for one exercise; renders nothing for exercises without standards. */
export const ExerciseLevelCard = ({ exerciseKey }: { exerciseKey: string }) => {
  const { t, data, lang, weight } = useApp();
  if (!ratedExercises.includes(exerciseKey)) return null;
  const bodyWeight = bodyWeightAt(data, today());
  const rating = rateExercise(data, exerciseKey);
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="medal" /> {t("Kraft-Einordnung", "Strength level")}
      </h2>
      {!data.settings.standards ? (
        <StandardsPicker />
      ) : !bodyWeight ? (
        <p className="hint">
          {t(
            "Trag unter „Körper“ dein Gewicht ein, um deine Kraft relativ zum Körpergewicht einzuordnen.",
            "Log your body weight under “Body” to rate your strength relative to it.",
          )}
        </p>
      ) : !rating ? (
        <p className="hint">{t("Keine Einheiten in den letzten 90 Tagen.", "No sessions in the last 90 days.")}</p>
      ) : (
        <>
          <p>
            <strong>{levelName(rating.level, lang)}</strong> · {formatNumber(rating.ratio, lang, 2)} × {t("Körpergewicht", "body weight")}
          </p>
          <LevelBar rating={rating} />
          {rating.nextRatio !== null && (
            <p className="hint">
              {t(
                `Nächste Stufe ab ≈ ${weight(rating.nextRatio * bodyWeight)} (1RM).`,
                `Next level from ≈ ${weight(rating.nextRatio * bodyWeight)} (1RM).`,
              )}
            </p>
          )}
        </>
      )}
      <p className="hint">
        {t(
          "Grobe Richtwerte auf Basis deines geschätzten 1RM der letzten 90 Tage.",
          "Rough guide values based on your estimated 1RM of the last 90 days.",
        )}
      </p>
    </section>
  );
};

/** Overview of all rated lifts the user has done, for the stats screen. */
export const StrengthOverview = () => {
  const { t, data, lang, exerciseName, open } = useApp();
  const done = ratedExercises.filter((key) => data.workouts.some((w) => w.exercises.some((e) => e.exerciseKey === key)));
  if (done.length === 0) return null;
  const bodyWeight = bodyWeightAt(data, today());
  const ratings = done.map((key) => rateExercise(data, key)).filter((r): r is Rating => r !== null);
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="medal" /> {t("Kraft-Einordnung", "Strength level")}
      </h2>
      {!data.settings.standards ? (
        <StandardsPicker />
      ) : !bodyWeight ? (
        <p className="hint">
          {t(
            "Trag unter „Körper“ dein Gewicht ein, um deine Kraft einzuordnen.",
            "Log your body weight under “Body” to rate your strength.",
          )}
        </p>
      ) : (
        <div className="stack">
          {ratings.map((r) => (
            <button key={r.exerciseKey} className="level-row" onClick={() => open({ type: "exercise", key: r.exerciseKey })}>
              <span className="level-row-head">
                <strong>{exerciseName(data.exercises.get(r.exerciseKey)!)}</strong>
                <small>
                  {levelName(r.level, lang)} · {formatNumber(r.ratio, lang, 2)}×
                </small>
              </span>
              <LevelBar rating={r} />
            </button>
          ))}
          {ratings.length === 0 && (
            <p className="hint">{t("Keine Einheiten in den letzten 90 Tagen.", "No sessions in the last 90 days.")}</p>
          )}
        </div>
      )}
    </section>
  );
};
