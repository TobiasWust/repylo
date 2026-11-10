import { useState } from "react";
import type { Muscle } from "../../domain/exercises";
import { dailyAdvice, type AdviceReason } from "../../domain/recovery";
import { useApp } from "../../ui/context";
import { Sticker, type StickerName } from "../../ui/stickers";
import { muscleName } from "../../ui/text";

const looks: Record<AdviceReason, { sticker: StickerName; color: string }> = {
  done: { sticker: "party", color: "var(--mint)" },
  goalAtRisk: { sticker: "muscle", color: "var(--pink)" },
  fresh: { sticker: "muscle", color: "var(--mint)" },
  backToBack: { sticker: "sleep", color: "var(--lavender)" },
  recovering: { sticker: "sleep", color: "var(--lavender)" },
  goalReached: { sticker: "sleep", color: "var(--sky)" },
};

/** Today's answer to "train or rest?", in a friendly tone. */
export const DayCard = () => {
  const { t, data, lang } = useApp();
  // The clock is read once per mount; render must stay pure.
  const [now] = useState(Date.now);
  const advice = dailyAdvice(data, now);
  const names = (list: readonly Muscle[]) => {
    const all = list.map((m) => muscleName(m, lang));
    return all.length > 1 ? `${all.slice(0, -1).join(", ")} ${t("und", "and")} ${all.at(-1)}` : (all[0] ?? "");
  };
  const fresh = names(advice.fresh.slice(0, 3));
  const tired = names(advice.tired.slice(0, 2).map((r) => r.muscle));

  const text: Record<AdviceReason, [string, string]> = {
    done: [
      t("Heute erledigt!", "Done for today!"),
      t(
        "Jetzt ist Erholung dran: trinken, essen, schlafen. Muskeln wachsen in der Pause.",
        "Now it's recovery time: drink, eat, sleep. Muscles grow while you rest.",
      ),
    ],
    goalAtRisk: [
      t("Heute ist Trainingstag!", "Today is a training day!"),
      t(
        `Sonst wird's knapp mit dem Wochenziel – noch ${advice.needed} ${advice.needed === 1 ? "Training" : "Trainings"} bis Sonntag.`,
        `Otherwise your weekly goal gets tight – ${advice.needed} more ${advice.needed === 1 ? "workout" : "workouts"} until Sunday.`,
      ),
    ],
    fresh: [
      t("Heute ist Trainingstag!", "Today is a training day!"),
      fresh
        ? t(`Ausgeruht und bereit: ${fresh}.`, `Rested and ready: ${fresh}.`)
        : t("Du bist ausgeruht – los geht's.", "You're rested – let's go."),
    ],
    backToBack: [
      t("Heute lieber Ruhetag", "Better a rest day today"),
      t(
        "Zwei Tage am Stück trainiert – gönn dir eine Pause. Morgen geht's frisch weiter.",
        "Two days in a row – treat yourself to a break. Tomorrow you're fresh again.",
      ),
    ],
    recovering: [
      t("Heute lieber Ruhetag", "Better a rest day today"),
      t(`${tired} erholen sich noch. Ein Spaziergang tut trotzdem gut.`, `${tired} are still recovering. A walk is still a good idea.`),
    ],
    goalReached: [
      t("Ruhetag verdient", "You've earned a rest day"),
      fresh
        ? t(
            `Wochenziel geschafft! Wenn du Lust hast: etwas Leichtes für ${fresh}.`,
            `Weekly goal done! If you feel like it: something light for ${fresh}.`,
          )
        : t("Wochenziel geschafft – genieß den freien Tag.", "Weekly goal done – enjoy the day off."),
    ],
  };
  const [title, body] = text[advice.reason];
  const look = looks[advice.reason];
  return (
    <section className="card day-card" style={{ background: look.color }}>
      <Sticker name={look.sticker} size={52} className="day-card-sticker" />
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </section>
  );
};
