import { useMemo } from "react";
import { addDays, today, weekStart } from "../../domain/dates";
import { getExercise } from "../../domain/model";
import {
  hasValue,
  averageDuration,
  majorMuscles,
  recordsSince,
  recentPrs,
  setsPerMuscle,
  trainedDays,
  weeklySetTarget,
  weeklyVolume,
  workoutsPerWeek,
} from "../../domain/stats";
import { formatNumber } from "../../domain/units";
import { BarChart, CountUp, Empty } from "../../ui/components";
import { useApp } from "../../ui/context";
import { formatDate, muscleName } from "../../ui/text";
import { Sticker } from "../../ui/stickers";
import { StrengthOverview } from "../../ui/StrengthLevel";
import { ReadinessCard } from "./ReadinessCard";
import { Heatmap } from "./Heatmap";
import { BalanceCard } from "./BalanceCard";
import { DepotCard } from "./DepotCard";

export const Stats = () => {
  const { t, data, lang, open, exerciseName, weight } = useApp();
  const days = useMemo(() => trainedDays(data), [data]);
  const weeks = useMemo(() => weeklyVolume(data, 12), [data]);
  const perWeek = useMemo(() => workoutsPerWeek(data), [data]);
  const last7 = useMemo(() => setsPerMuscle(data, addDays(today(), -6)), [data]);
  const prs = useMemo(() => recentPrs(data, 6), [data]);
  const [target, upper] = weeklySetTarget[data.settings.goal];

  if (days.size === 0)
    return (
      <div className="screen">
        <h1 className="page-title">{t("Statistik", "Stats")}</h1>
        <Empty sticker="chartUp">
          {t("Sobald du trainiert hast, findest du hier deine Fortschritte.", "Once you’ve trained, your progress shows up here.")}
        </Empty>
      </div>
    );

  const records30 = recordsSince(data, addDays(today(), -29));
  const duration = averageDuration(data);
  const totalWorkouts = data.workouts.filter((w) => w.exercises.some((e) => e.sets.some(hasValue))).length;

  return (
    <div className="screen">
      <h1 className="page-title">{t("Statistik", "Stats")}</h1>

      <div className="stat-grid">
        <div className="stat-tile yellow">
          <span>{t("Trainings", "Workouts")}</span>
          <strong>
            <CountUp value={totalWorkouts} format={(n) => String(Math.round(n))} />
          </strong>
        </div>
        <div
          className="stat-tile pink"
          title={t("Neue Bestwerte (geschätztes 1RM) in den letzten 30 Tagen", "New records (est. 1RM) in the last 30 days")}
        >
          <span>{t("Bestwerte (30 T.)", "Records (30 d)")}</span>
          <strong className="with-sticker">
            <Sticker name="trophy" size={26} /> <CountUp value={records30} format={(n) => String(Math.round(n))} />
          </strong>
        </div>
        <div
          className="stat-tile lavender"
          title={t("Von Start bis „Fertig“, letzte 20 Trainings", "From start to “Done”, last 20 workouts")}
        >
          <span>{t("Ø Dauer", "Avg duration")}</span>
          <strong>{duration !== null ? <CountUp value={duration} format={(n) => `${Math.round(n)} min`} /> : "–"}</strong>
        </div>
        <div className="stat-tile mint">
          <span>
            {perWeek && perWeek.weeks > 1
              ? t(`Ø pro Woche (${perWeek.weeks} Wo.)`, `Avg/week (${perWeek.weeks} wk)`)
              : t("Ø pro Woche", "Avg/week")}
          </span>
          <strong>
            <CountUp value={perWeek?.average ?? 0} format={(n) => formatNumber(n, lang, 1)} />
          </strong>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">{t("Trainingstage", "Training days")}</h2>
        <Heatmap days={days} />
      </section>

      <section className="card">
        <h2 className="card-title">{t("Sätze pro Woche", "Sets per week")}</h2>
        <BarChart
          bars={weeks.map((w) => ({
            label: formatDate(w.week, lang).replace(/\.$/, ""),
            value: w.sets,
            highlight: w.week === weekStart(today()),
          }))}
          format={(v) => formatNumber(v, lang, 0)}
        />
      </section>

      <section className="card">
        <h2 className="card-title">{t("Sätze pro Muskelgruppe (7 Tage)", "Sets per muscle (7 days)")}</h2>
        <p className="hint">
          {t(
            `Ziel: ${target}–${upper} Sätze pro Woche. Hilfsmuskeln zählen halb.`,
            `Target: ${target}–${upper} sets per week. Secondary muscles count half.`,
          )}
        </p>
        <div className="muscle-bars">
          {majorMuscles.map((m, i) => {
            const value = last7.get(m) ?? 0;
            const status = value >= target ? (value > upper ? "over" : "good") : value >= target / 2 ? "low" : "none";
            return (
              <div key={m} className="muscle-row">
                <span className="muscle-name">{muscleName(m, lang)}</span>
                <div className="muscle-track">
                  <div
                    className={`muscle-fill ${status}`}
                    style={{ width: `${Math.min(100, (value / upper) * 100)}%`, "--i": i } as React.CSSProperties}
                  />
                  <div className="muscle-target" style={{ left: `${(target / upper) * 100}%` }} />
                </div>
                <span className="muscle-value">{formatNumber(value, lang, 1)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <BalanceCard />

      <ReadinessCard />

      <StrengthOverview />

      <button className="card list-card review-link" onClick={() => open({ type: "review", month: today().slice(0, 7) })}>
        <Sticker name="party" size={34} />
        <span className="list-main">
          <strong>{t("Monatsrückblick", "Monthly review")}</strong>
          <small>{t("Deine Monate auf einen Blick – auch zum Teilen", "Your months at a glance – ready to share")}</small>
        </span>
        <span className="chev">›</span>
      </button>

      {prs.length > 0 && (
        <section className="card">
          <h2 className="card-title with-sticker">
            <Sticker name="trophy" /> {t("Letzte Rekorde", "Recent records")}
          </h2>
          <p className="hint">
            {t(
              "Geschätztes Maximalgewicht für 1 Wiederholung, berechnet aus deinen Sätzen.",
              "Estimated one-rep max, calculated from your sets.",
            )}
          </p>
          <div className="stack tight">
            {prs.map((pr, i) => (
              <button key={i} className="pr-line" onClick={() => open({ type: "exercise", key: pr.exerciseKey })}>
                <span>{exerciseName(getExercise(data, pr.exerciseKey))}</span>
                <strong>
                  <small>1RM ≈ </small>
                  {weight(pr.value)}
                </strong>
                <small>{formatDate(pr.date, lang)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <DepotCard />
    </div>
  );
};
