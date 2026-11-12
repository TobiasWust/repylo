import { useMemo, useState } from "react";
import { addDays, today, weekStart } from "../../domain/dates";
import { getExercise } from "../../domain/model";
import { computeSuggestions } from "../../domain/suggestions";
import { hasValue, trainedDays, weekStreak } from "../../domain/stats";
import { InstallCard } from "../../ui/InstallCard";
import { PlanSheet } from "../../ui/PlanSheet";
import { Icon } from "../../ui/components";
import { Sticker } from "../../ui/stickers";
import { previousMonth } from "../../domain/review";
import { isDeloadWeek } from "../../domain/progression";
import { useApp } from "../../ui/context";
import { formatDate, monthName, plural } from "../../ui/text";
import { ensureTodayWorkout, templateItems } from "../../ui/workoutOps";
import { SuggestionCard } from "./SuggestionCard";
import { GoalRing } from "./GoalRing";
import { DayCard } from "./DayCard";
import { useLastSeen } from "../../ui/motion";

const tileColors = ["var(--yellow)", "var(--pink)", "var(--mint)", "var(--lavender)", "var(--sky)"];

export const Home = () => {
  const app = useApp();
  const { t, data, actions, open, lang, exerciseName, setTab } = app;
  const todays = data.workouts.find((w) => w.date === today());
  // Read the clock once per mount; render must stay pure.
  const [now] = useState(Date.now);
  // Recompute when data changes; "now" is fixed per render on purpose.
  const suggestions = useMemo(() => computeSuggestions(data), [data]);
  const days = useMemo(() => trainedDays(data), [data]);
  const goal = data.settings.weeklyGoal;
  const streak = weekStreak(days, goal);
  const thisWeek = weekStart(today());
  const weekWorkouts = data.workouts.filter((w) => w.date >= thisWeek && w.exercises.some((e) => e.sets.some(hasValue)));
  const weekSets = weekWorkouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.filter(hasValue).length, 0), 0);
  // Only the last workout; the History tab has the rest.
  const recent = data.workouts.filter((w) => w.date !== today()).slice(0, 1);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(thisWeek, i));
  const daysThisWeek = weekDays.filter((d) => days.has(d)).length;
  // Since this screen was last shown: days ticked off get stamped, a grown streak flickers.
  const seenDays = useLastSeen("home.week", weekDays.filter((d) => days.has(d)).join(","));
  const seenStreak = useLastSeen("home.streak", streak);
  const stamped = (d: string) => seenDays !== undefined && days.has(d) && !seenDays.split(",").includes(d);
  const streakGrew = seenStreak !== undefined && streak > seenStreak;
  // First week of a month: offer last month's review (once, dismissable).
  const lastMonth = previousMonth(today().slice(0, 7));
  const showReview =
    Number(today().slice(8)) <= 7 &&
    data.workouts.some((w) => w.date.startsWith(lastMonth)) &&
    (data.dismissedUntil.get(`review:${lastMonth}`) ?? 0) < now;

  const [planSheet, setPlanSheet] = useState(false);
  const startToday = () => open({ type: "workout", id: ensureTodayWorkout(data, actions).id });
  const startTemplate = (templateId: string) => {
    const template = data.templates.find((x) => x.id === templateId);
    if (!template) return;
    const workout = ensureTodayWorkout(data, actions, template.id);
    const already = new Set(workout.exercises.map((e) => e.exerciseKey));
    actions.addItems(
      workout,
      templateItems(data, template, workout.id).filter((i) => !already.has(i.exerciseKey)),
    );
    open({ type: "workout", id: workout.id });
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="logo">repylo</div>
          <div className="tagline">Every rep counts.</div>
        </div>
        <div
          className={`streak-badge ${streakGrew ? "grew" : ""}`}
          title={t("Wochen in Folge mit erreichtem Wochenziel", "Weeks in a row with your weekly goal reached")}
        >
          <Sticker name="flame" size={26} /> {streak}
        </div>
      </header>

      <DayCard />

      <section className="card hero">
        <div className="hero-top">
          <GoalRing done={daysThisWeek} goal={goal} />
          <div>
            <div className="hero-label">{t("Diese Woche", "This week")}</div>
            <div className="hero-value">
              {daysThisWeek}
              <small> / {goal}</small>
            </div>
            <div className="hero-label">
              {isDeloadWeek(data) && <strong>{t("Deload-Woche · ", "Deload week · ")}</strong>}
              {daysThisWeek >= goal
                ? t("Wochenziel geschafft!", "Weekly goal reached!")
                : t(
                    `Noch ${goal - daysThisWeek} ${goal - daysThisWeek === 1 ? "Trainingstag" : "Trainingstage"}`,
                    `${goal - daysThisWeek} more training ${goal - daysThisWeek === 1 ? "day" : "days"} to go`,
                  )}
            </div>
          </div>
        </div>
        <div className="week-dots">
          {weekDays.map((d) => (
            <span key={d} className={`week-dot ${days.has(d) ? "on" : ""} ${d === today() ? "today" : ""} ${stamped(d) ? "stamped" : ""}`}>
              {new Date(`${d}T12:00`).toLocaleDateString(lang, { weekday: "narrow" })}
            </span>
          ))}
        </div>
        <div className="hero-stats">
          <div>
            <span>{t("Sätze", "Sets")}</span>
            <strong>{weekSets}</strong>
          </div>
          <div>
            <span>{t("Serie", "Streak")}</span>
            <strong>
              {streak} {t(streak === 1 ? "Woche" : "Wochen", streak === 1 ? "week" : "weeks")}
            </strong>
          </div>
        </div>
        <button className="button dark big full" onClick={startToday}>
          <Icon name={todays ? "dumbbell" : "bolt"} />
          {todays ? t("Heutiges Training fortsetzen", "Continue today’s workout") : t("Training starten", "Start workout")}
        </button>
      </section>

      {data.templates.length === 0 && (data.dismissedUntil.get("plan-offer") ?? 0) < now && (
        <section className="card plan-offer">
          <div className="suggestion-head">
            <Sticker name="calendar" size={34} />
            <h3>{t("Soll ich dir einen Trainingsplan bauen?", "Shall I build you a training plan?")}</h3>
            <button
              className="icon-button small"
              onClick={() => actions.dismiss("plan-offer", 365)}
              aria-label={t("Ausblenden", "Dismiss")}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <p>
            {t(
              "Sag mir, wie oft und wo du trainierst – ich stelle passende Trainingstage zusammen.",
              "Tell me how often and where you train – I'll put together matching training days.",
            )}
          </p>
          <button className="button dark full" onClick={() => setPlanSheet(true)}>
            {t("Plan erstellen", "Create plan")}
          </button>
        </section>
      )}

      <InstallCard />

      {showReview && (
        <section className="card review-teaser">
          <div className="suggestion-head">
            <Sticker name="party" size={34} />
            <h3>{t(`Dein ${monthName(lastMonth, lang)}-Rückblick ist da`, `Your ${monthName(lastMonth, lang)} review is ready`)}</h3>
            <button
              className="icon-button small"
              onClick={() => actions.dismiss(`review:${lastMonth}`, 40)}
              aria-label={t("Ausblenden", "Dismiss")}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <button className="button dark full" onClick={() => open({ type: "review", month: lastMonth })}>
            {t("Ansehen", "Show me")}
          </button>
        </section>
      )}

      {data.templates.length > 0 && (
        <section>
          <h2 className="section-title">{t("Schnellstart", "Quick start")}</h2>
          <div className="tiles">
            {data.templates.slice(0, 8).map((tpl, i) => (
              <button key={tpl.id} className="tile" onClick={() => startTemplate(tpl.id)}>
                <span className="tile-icon" style={{ background: tileColors[i % tileColors.length] }}>
                  {i + 1}
                </span>
                <span className="tile-label">{tpl.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section>
          <h2 className="section-title">{t("Vorschläge für dich", "Suggestions for you")}</h2>
          <div className="stack">
            {suggestions.map((s) => (
              <SuggestionCard key={s.key} suggestion={s} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-row">
          <h2 className="section-title">{t("Letztes Training", "Last workout")}</h2>
          {recent.length > 0 && (
            <button className="link" onClick={() => setTab("history")}>
              {t("Alle", "All")}
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="card muted-card with-sticker">
            <Sticker name="muscle" size={34} /> {t("Noch keine Trainings. Leg los!", "No workouts yet. Let’s go!")}
          </div>
        ) : (
          <div className="stack">
            {recent.map((w) => (
              <button key={w.id} className="card list-card" onClick={() => open({ type: "workout", id: w.id })}>
                <span className="list-icon">
                  <Sticker name="dumbbell" size={30} />
                </span>
                <span className="list-main">
                  <strong>
                    {data.templates.find((x) => x.id === w.templateId)?.name ??
                      (w.exercises
                        .map((e) => exerciseName(getExercise(data, e.exerciseKey)))
                        .slice(0, 3)
                        .join(", ") ||
                        t("Leeres Training", "Empty workout"))}
                  </strong>
                  <small>
                    {formatDate(w.date, lang, "long")} · {w.exercises.length}{" "}
                    {plural(w.exercises.length, t("Übung", "exercise"), t("Übungen", "exercises"))}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      {planSheet && <PlanSheet onClose={() => setPlanSheet(false)} />}
    </div>
  );
};
