import { useMemo, useRef, useState } from "react";
import { addDays, today, weekStart } from "../domain/dates";
import type { Muscle } from "../domain/exercises";
import { getExercise } from "../domain/model";
import { computeSuggestions, dismissDays, type Suggestion } from "../domain/suggestions";
import { hasValue, trainedDays, weekStreak } from "../domain/stats";
import { BackfillSheet } from "../ui/BackfillSheet";
import { InstallCard } from "../ui/InstallCard";
import { Icon } from "../ui/components";
import { Sticker, type StickerName } from "../ui/stickers";
import { previousMonth } from "../domain/review";
import { useApp, type App } from "../ui/context";
import { useFeedback } from "../ui/feedback";
import { formatDate, monthName, muscleName } from "../ui/text";
import { ensureTodayWorkout, initialSets, templateItems } from "../ui/workoutOps";

const tileColors = ["var(--yellow)", "var(--pink)", "var(--mint)", "var(--lavender)", "var(--sky)"];
const cardColors: Record<Suggestion["kind"], string> = {
  split: "var(--yellow)",
  neglected: "var(--pink)",
  missing: "var(--lavender)",
  imbalance: "var(--mint)",
  plateau: "var(--sky)",
};
const cardSticker: Record<Suggestion["kind"], StickerName> = { split: "repeat", neglected: "target", missing: "hourglass", imbalance: "balance", plateau: "chartUp" };

const suggestionText = (s: Suggestion, app: App): { title: string; text: string } => {
  const { t, lang, data, exerciseName } = app;
  const p = s.params;
  const ex = (key: string | number | undefined) => exerciseName(getExercise(data, String(key)));
  switch (s.kind) {
    case "split":
      return {
        title: t(`Als Nächstes dran: ${p.name}`, `Up next: ${p.name}`),
        text: p.last ? t(`Zuletzt hast du „${p.last}“ trainiert.`, `Last time you did “${p.last}”.`) : t("Starte deinen Split.", "Start your split."),
      };
    case "neglected":
      return {
        title: t(`${muscleName(p.muscle as Muscle, lang)} kommt zu kurz`, `${muscleName(p.muscle as Muscle, lang)} needs work`),
        text: t(`Nur ~${p.sets} Sätze pro Woche – Ziel: ${p.target}+.`, `Only ~${p.sets} sets per week – target: ${p.target}+.`),
      };
    case "missing":
      return {
        title: t("Lange nicht gemacht", "Haven’t done these in a while"),
        text: t(`${ex(p.exercise)} seit ${p.days} Tagen nicht mehr.`, `${ex(p.exercise)}: ${p.days} days ago.`),
      };
    case "imbalance": {
      const side = String(p.side);
      const title =
        side === "pull" ? t("Mehr ziehen", "More pulling")
        : side === "push" ? t("Mehr drücken", "More pushing")
        : side === "hamstrings" ? t("Beinbeuger ausgleichen", "Balance your hamstrings")
        : t("Quadrizeps ausgleichen", "Balance your quads");
      const what =
        side === "pull" ? t("Drück- vs. Zug", "Push vs. pull")
        : side === "push" ? t("Zug- vs. Drück", "Pull vs. push")
        : side === "hamstrings" ? t("Quadrizeps- vs. Beinbeuger-", "Quad vs. hamstring")
        : t("Beinbeuger- vs. Quadrizeps-", "Hamstring vs. quad");
      return { title, text: t(`${what}sätze in 14 Tagen: ${p.more} zu ${p.less}.`, `${what} sets in 14 days: ${p.more} to ${p.less}.`) };
    }
    case "plateau":
      return {
        title: t(`Plateau bei ${ex(p.exercise)}`, `Plateau on ${ex(p.exercise)}`),
        text: t(`Seit ~4 Wochen kein neuer Bestwert. Probier mal ${ex(p.variant)}.`, `No new best in ~4 weeks. Try ${ex(p.variant)}.`),
      };
  }
};

const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => {
  const app = useApp();
  const { t, data, actions, exerciseName, open } = app;
  const { toast } = useFeedback();
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const { title, text } = suggestionText(suggestion, app);

  const dismiss = () => {
    setLeaving(true);
    setDx((d) => (d < 0 ? -500 : 500));
    setTimeout(() => actions.dismiss(suggestion.key, dismissDays), 220);
  };

  const accept = () => {
    const template = data.templates.find((x) => x.id === suggestion.templateId);
    const workout = ensureTodayWorkout(data, actions, template?.id ?? null);
    const already = new Set(workout.exercises.map((e) => e.exerciseKey));
    const items = template
      ? templateItems(data, template, workout.id).filter((i) => !already.has(i.exerciseKey))
      : suggestion.exerciseKeys.filter((k) => !already.has(k)).map((exerciseKey) => ({ exerciseKey, sets: initialSets(data, exerciseKey, workout.id) }));
    actions.addItems(workout, items);
    toast(t("Ins heutige Training übernommen", "Added to today’s workout"));
    open({ type: "workout", id: workout.id });
  };

  return (
    <div
      className={`card suggestion ${leaving ? "leaving" : ""}`}
      style={{ background: cardColors[suggestion.kind], transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, opacity: 1 - Math.min(Math.abs(dx) / 400, 0.6) }}
      onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY, dragging: false })}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const mx = e.clientX - s.x;
        if (!s.dragging && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(e.clientY - s.y)) {
          s.dragging = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
        if (s.dragging) setDx(mx);
      }}
      onPointerUp={() => {
        if (start.current?.dragging && Math.abs(dx) > 100) dismiss();
        else setDx(0);
        start.current = null;
      }}
      onPointerCancel={() => {
        setDx(0);
        start.current = null;
      }}
    >
      <div className="suggestion-head">
        <Sticker name={cardSticker[suggestion.kind]} size={30} />
        <h3>{title}</h3>
        <button className="icon-button small" onClick={dismiss} aria-label={t("Ausblenden", "Dismiss")}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <p>{text}</p>
      <div className="chips">
        {suggestion.exerciseKeys.slice(0, 4).map((k) => (
          <span key={k} className="chip static">
            {exerciseName(getExercise(data, k))}
          </span>
        ))}
        {suggestion.exerciseKeys.length > 4 && <span className="chip static">+{suggestion.exerciseKeys.length - 4}</span>}
      </div>
      <button className="button dark full" onClick={accept}>
        <Icon name="plus" size={18} /> {t("Ins heutige Training übernehmen", "Add to today’s workout")}
      </button>
    </div>
  );
};

/** Progress ring for the weekly goal (training days this week / goal). */
const GoalRing = ({ done, goal }: { done: number; goal: number }) => {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const share = Math.min(1, done / goal);
  return (
    <svg className="goal-ring" width={84} height={84} viewBox="0 0 84 84" aria-hidden>
      <circle cx={42} cy={42} r={r} fill="#fff" stroke="var(--ink)" strokeWidth={3} />
      <circle cx={42} cy={42} r={r} fill="none" stroke="#fff" strokeWidth={11} />
      <circle
        cx={42}
        cy={42}
        r={r}
        fill="none"
        stroke={share >= 1 ? "var(--bg)" : "var(--pink)"}
        strokeWidth={11}
        strokeDasharray={`${share * circumference} ${circumference}`}
        transform="rotate(-90 42 42)"
      />
      <circle cx={42} cy={42} r={r + 5.5} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
      <circle cx={42} cy={42} r={r - 5.5} fill="var(--yellow)" stroke="var(--ink)" strokeWidth={2.5} />
      <foreignObject x={22} y={22} width={40} height={40}>
        <div className="goal-ring-center">{share >= 1 ? <Sticker name="medal" size={30} /> : <Sticker name="flame" size={28} />}</div>
      </foreignObject>
    </svg>
  );
};

export const Home = () => {
  const app = useApp();
  const { t, data, actions, open, lang, exerciseName, setTab } = app;
  const todays = data.workouts.find((w) => w.date === today());
  // Recompute when data changes; "now" is fixed per render on purpose.
  const suggestions = useMemo(() => computeSuggestions(data), [data]);
  const days = useMemo(() => trainedDays(data), [data]);
  const goal = data.settings.weeklyGoal;
  const streak = weekStreak(days, goal);
  const thisWeek = weekStart(today());
  const weekWorkouts = data.workouts.filter((w) => w.date >= thisWeek && w.exercises.some((e) => e.sets.some(hasValue)));
  const weekSets = weekWorkouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.filter(hasValue).length, 0), 0);
  const recent = data.workouts.filter((w) => w.date !== today()).slice(0, 5);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(thisWeek, i));
  const daysThisWeek = weekDays.filter((d) => days.has(d)).length;
  // First week of a month: offer last month's review (once, dismissable).
  const lastMonth = previousMonth(today().slice(0, 7));
  const showReview =
    Number(today().slice(8)) <= 7 &&
    data.workouts.some((w) => w.date.startsWith(lastMonth)) &&
    (data.dismissedUntil.get(`review:${lastMonth}`) ?? 0) < Date.now();

  const [backfill, setBackfill] = useState(false);
  const startToday = () => open({ type: "workout", id: ensureTodayWorkout(data, actions).id });
  const startTemplate = (templateId: string) => {
    const template = data.templates.find((x) => x.id === templateId);
    if (!template) return;
    const workout = ensureTodayWorkout(data, actions, template.id);
    const already = new Set(workout.exercises.map((e) => e.exerciseKey));
    actions.addItems(workout, templateItems(data, template, workout.id).filter((i) => !already.has(i.exerciseKey)));
    open({ type: "workout", id: workout.id });
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="logo">repylo</div>
          <div className="tagline">Every rep counts.</div>
        </div>
        <div className="streak-badge" title={t("Wochen in Folge mit erreichtem Wochenziel", "Weeks in a row with your weekly goal reached")}>
          <Sticker name="flame" size={26} /> {streak}
        </div>
      </header>

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
              {daysThisWeek >= goal
                ? t("Wochenziel geschafft!", "Weekly goal reached!")
                : t(`Noch ${goal - daysThisWeek} ${goal - daysThisWeek === 1 ? "Trainingstag" : "Trainingstage"}`, `${goal - daysThisWeek} more training ${goal - daysThisWeek === 1 ? "day" : "days"} to go`)}
            </div>
          </div>
        </div>
        <div className="week-dots">
          {weekDays.map((d) => (
            <span key={d} className={`week-dot ${days.has(d) ? "on" : ""} ${d === today() ? "today" : ""}`}>
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
          {todays ? t("Heutiges Training fortsetzen", "Continue today’s workout") : t("Heute trainiert", "I trained today")}
        </button>
        <button className="button full soft" onClick={() => setBackfill(true)}>
          <Sticker name="calendar" size={24} /> {t("Früheres Training nachtragen", "Log a past workout")}
        </button>
      </section>

      <InstallCard />

      {showReview && (
        <section className="card review-teaser">
          <div className="suggestion-head">
            <Sticker name="party" size={34} />
            <h3>{t(`Dein ${monthName(lastMonth, lang)}-Rückblick ist da`, `Your ${monthName(lastMonth, lang)} review is ready`)}</h3>
            <button className="icon-button small" onClick={() => actions.dismiss(`review:${lastMonth}`, 40)} aria-label={t("Ausblenden", "Dismiss")}>
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
          <p className="hint">{t("Zum Ausblenden zur Seite wischen.", "Swipe sideways to dismiss.")}</p>
        </section>
      )}

      <section>
        <div className="section-row">
          <h2 className="section-title">{t("Letzte Trainings", "Recent workouts")}</h2>
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
                      (w.exercises.map((e) => exerciseName(getExercise(data, e.exerciseKey))).slice(0, 3).join(", ") || t("Leeres Training", "Empty workout"))}
                  </strong>
                  <small>
                    {formatDate(w.date, lang, "long")} · {w.exercises.length} {t("Übungen", "exercises")}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      {backfill && <BackfillSheet onClose={() => setBackfill(false)} />}
    </div>
  );
};
