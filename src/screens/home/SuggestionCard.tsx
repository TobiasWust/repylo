import { useRef, useState } from "react";
import { today, weekStart } from "../../domain/dates";
import type { Muscle } from "../../domain/exercises";
import { getExercise } from "../../domain/model";
import { dismissDays, type Suggestion } from "../../domain/suggestions";
import { Icon } from "../../ui/components";
import { Sticker, type StickerName } from "../../ui/stickers";
import { useApp, type App } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { muscleName } from "../../ui/text";
import { ensureTodayWorkout, initialSets, templateItems } from "../../ui/workoutOps";
import type { BalanceKey } from "../../domain/balance";
import { balanceSides } from "../../ui/balance";

const cardColors: Record<Suggestion["kind"], string> = {
  split: "var(--yellow)",
  neglected: "var(--pink)",
  missing: "var(--lavender)",
  imbalance: "var(--mint)",
  plateau: "var(--sky)",
  deload: "var(--lavender)",
};
const cardSticker: Record<Suggestion["kind"], StickerName> = {
  split: "repeat",
  neglected: "target",
  missing: "hourglass",
  imbalance: "balance",
  plateau: "chartUp",
  deload: "scale",
};

const suggestionText = (s: Suggestion, app: App): { title: string; text: string } => {
  const { t, lang, data, exerciseName } = app;
  const p = s.params;
  const ex = (key: string | number | undefined) => exerciseName(getExercise(data, String(key)));
  switch (s.kind) {
    case "split":
      return {
        title: t(`Als Nächstes dran: ${p.name}`, `Up next: ${p.name}`),
        text: p.last
          ? t(`Zuletzt hast du „${p.last}“ trainiert.`, `Last time you did “${p.last}”.`)
          : t("Starte deinen Split.", "Start your split."),
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
      const [l, r] = balanceSides[p.pair as BalanceKey];
      const weak = p.side === "left" ? l : r;
      return {
        title: t(`Mehr ${weak.de}`, `More ${weak.en.toLowerCase()}`),
        text: t(
          `${l.de} vs. ${r.de} in 14 Tagen: ${p.left} zu ${p.right} Sätze.`,
          `${l.en} vs. ${r.en.toLowerCase()} in 14 days: ${p.left} to ${p.right} sets.`,
        ),
      };
    }
    case "deload":
      return {
        title: t("Zeit für eine leichtere Woche", "Time for an easier week"),
        text: t(
          `Du trainierst seit ${p.weeks} Wochen am Stück. Eine Deload-Woche mit etwas weniger Gewicht und einem Satz weniger lässt Muskeln und Gelenke aufholen – danach geht's stärker weiter.`,
          `You've trained ${p.weeks} weeks in a row. A deload week with a bit less weight and one set fewer lets muscles and joints catch up – you'll come back stronger.`,
        ),
      };
    case "plateau":
      return {
        title: t(`Plateau bei ${ex(p.exercise)}`, `Plateau on ${ex(p.exercise)}`),
        text: t(`Seit ~4 Wochen kein neuer Bestwert. Probier mal ${ex(p.variant)}.`, `No new best in ~4 weeks. Try ${ex(p.variant)}.`),
      };
  }
};

export const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => {
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
      <div className="chips" hidden={suggestion.exerciseKeys.length === 0}>
        {suggestion.exerciseKeys.slice(0, 4).map((k) => (
          <span key={k} className="chip static">
            {exerciseName(getExercise(data, k))}
          </span>
        ))}
        {suggestion.exerciseKeys.length > 4 && <span className="chip static">+{suggestion.exerciseKeys.length - 4}</span>}
      </div>
      <button className="button dark full" onClick={accept}>
        {suggestion.kind === "deload" ? (
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
