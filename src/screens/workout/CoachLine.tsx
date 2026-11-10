import type { SetFeedback } from "../../domain/coach";
import { formatDuration, formatNumber, toUnit } from "../../domain/units";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";

/** One line of coach feedback for the latest done set of an exercise. */
export const CoachLine = ({ feedback, metric }: { feedback: SetFeedback; metric: string }) => {
  const app = useApp();
  const { t, weight, lang } = app;
  const timed = metric === "time" || metric === "cardio";
  const amount = (n: number) => (timed ? `${n} s` : `${n} ${t("Wdh.", "reps")}`);
  const kg = (n: number) => weight(n);
  const text: Record<SetFeedback["kind"], string> = {
    heavier: t(`${kg(feedback.delta)} mehr als letztes Mal – stark!`, `${kg(feedback.delta)} more than last time – strong!`),
    moreReps: t(`${amount(feedback.delta)} mehr als letztes Mal – stark!`, `${amount(feedback.delta)} more than last time – strong!`),
    same: t("Genau wie letztes Mal – solide.", "Same as last time – solid."),
    fewerReps: t(`${amount(feedback.delta)} weniger als letztes Mal. Gönn dir etwas mehr Pause.`, `${amount(feedback.delta)} fewer than last time. Take a slightly longer rest.`),
    lighter: t(`${kg(feedback.delta)} leichter als letztes Mal – Technik geht vor.`, `${kg(feedback.delta)} lighter than last time – technique first.`),
    first: t("Erster Eintrag – ab jetzt vergleicht repylo für dich.", "First entry – from now on repylo compares for you."),
  };
  const positive = feedback.kind === "heavier" || feedback.kind === "moreReps";
  const next = feedback.next;
  const nextText =
    next && (timed ? next.duration : next.reps)
      ? timed
        ? formatDuration(next.duration ?? 0)
        : `${next.reps}${next.weight ? ` × ${formatNumber(toUnit(next.weight, app.data.settings.unit), lang)} ${app.data.settings.unit}` : ""}`
      : null;
  return (
    <div className={`coach-line ${positive ? "positive" : ""}`}>
      <Sticker name={positive ? "muscle" : feedback.kind === "fewerReps" ? "hourglass" : "bulb"} size={26} />
      <span>
        {text[feedback.kind]}
        {nextText && (
          <>
            {" "}
            <strong>{t(`Nächster Satz: ${nextText}`, `Next set: ${nextText}`)}</strong>
          </>
        )}
      </span>
    </div>
  );
};
