import { useRef, useState } from "react";
import { today, weekStart } from "../../domain/dates";
import { getExercise } from "../../domain/model";
import { insightDismissDays } from "../../domain/insights";
import { dismissDays, homePauseDays, homePauseKey, type Suggestion } from "../../domain/suggestions";
import { Icon } from "../../ui/components";
import { Sticker } from "../../ui/stickers";
import { cardColors, cardSticker, suggestionText, whyText } from "../../ui/suggestionText";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { ensureTodayWorkout, initialSets, templateItems } from "../../ui/workoutOps";

export const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => {
  const app = useApp();
  const { t, data, actions, exerciseName, open } = app;
  const { toast } = useFeedback();
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const { title, text } = suggestionText(suggestion, app);
  const why = whyText(suggestion, app);

  const dismiss = () => {
    setLeaving(true);
    setDx((d) => (d < 0 ? -500 : 500));
    setTimeout(() => {
      actions.dismiss(suggestion.key, suggestion.info ? insightDismissDays : dismissDays);
      actions.dismiss(homePauseKey, homePauseDays);
    }, 220);
  };

  const accept = () => {
    if (suggestion.info) return dismiss();
    if (suggestion.kind === "unchecked") return open({ type: "workout", id: String(suggestion.params.workoutId) });
    if (suggestion.kind === "deload") {
      actions.updateSettings({ deloadWeek: weekStart(today()) });
      toast(
        t("Deload-Woche gestartet – die Vorschläge sind diese Woche leichter", "Deload week started – suggestions are lighter this week"),
      );
      return;
    }
    const template = data.templates.find((x) => x.id === suggestion.templateId);
    const workout = ensureTodayWorkout(data, actions, template?.id ?? null);
    const already = new Set(workout.exercises.map((e) => e.exerciseKey));
    const items = template
      ? templateItems(data, template, workout.id).filter((i) => !already.has(i.exerciseKey))
      : suggestion.exerciseKeys
          .filter((k) => !already.has(k))
          .map((exerciseKey) => ({ exerciseKey, sets: initialSets(data, exerciseKey, workout.id) }));
    actions.addItems(workout, items);
    toast(t("Ins heutige Training übernommen", "Added to today’s workout"));
    open({ type: "workout", id: workout.id });
  };

  return (
    <div
      className={`card suggestion ${leaving ? "leaving" : ""}`}
      style={{
        background: cardColors[suggestion.kind],
        transform: `translateX(${dx}px) rotate(${dx / 40}deg)`,
        opacity: 1 - Math.min(Math.abs(dx) / 400, 0.6),
      }}
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
      {why && (
        <details className="why">
          <summary>{t("Warum?", "Why?")}</summary>
          <p>{why}</p>
        </details>
      )}
      <div className="chips" hidden={suggestion.exerciseKeys.length === 0}>
        {suggestion.exerciseKeys.slice(0, 4).map((k) => (
          <span key={k} className="chip static">
            {exerciseName(getExercise(data, k))}
          </span>
        ))}
        {suggestion.exerciseKeys.length > 4 && <span className="chip static">+{suggestion.exerciseKeys.length - 4}</span>}
      </div>
      <button className="button dark full" onClick={accept}>
        {suggestion.info ? (
          t("Verstanden", "Got it")
        ) : suggestion.kind === "unchecked" ? (
          t("Ansehen", "Show me")
        ) : suggestion.kind === "deload" ? (
          t("Deload-Woche starten", "Start deload week")
        ) : (
          <>
            <Icon name="plus" size={18} /> {t("Ins heutige Training übernehmen", "Add to today’s workout")}
          </>
        )}
      </button>
    </div>
  );
};
