import { useState } from "react";
import type { Muscle } from "../../domain/exercises";
import { dailyAdvice, type AdviceReason } from "../../domain/recovery";
import { useApp } from "../../ui/context";
import { Sticker, type StickerName } from "../../ui/stickers";
import { muscleName, readyLabel } from "../../ui/text";

const looks: Record<AdviceReason, { sticker: StickerName; color: string }> = {
  done: { sticker: "party", color: "var(--mint)" },
  goalAtRisk: { sticker: "muscle", color: "var(--pink)" },
  fresh: { sticker: "muscle", color: "var(--mint)" },
  catchUp: { sticker: "muscle", color: "var(--mint)" },
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
    catchUp: [
      t("Heute geht was", "Today's a go"),
      t(
        `Damit sich dein Wochenziel gut verteilt: Training für ${fresh}. ${tired} ${Math.min(advice.tired.length, 2) === 1 ? "darf" : "dürfen"} sich noch ausruhen.`,
        `To spread your weekly goal evenly: train ${fresh}. Let ${tired} rest a bit longer.`,
      ),
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
      t("Wochenziel geschafft!", "Weekly goal done!"),
      fresh
        ? t(
            `Heute ist frei – oder ein Bonus-Training für ${fresh}, wenn du Lust hast.`,
            `Take the day off – or add a bonus workout for ${fresh} if you feel like it.`,
          )
        : t("Genieß den freien Tag.", "Enjoy the day off."),
    ],
  };
  // When the tired big muscles are back, grouped by day: "Beine morgen · Brust und Rücken am Mittwoch".
  const byDay = new Map<string, Muscle[]>();
  for (const r of advice.tired) if (r.readyOn) byDay.set(r.readyOn, [...(byDay.get(r.readyOn) ?? []), r.muscle]);
  const ready = [...byDay]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([day, list]) =>
        `${list.length > 3 ? t(`${list.length} Muskelgruppen`, `${list.length} muscle groups`) : names(list)} ${readyLabel(day, lang)}`,
    )
    .join(" · ");

  const [title, body] = text[advice.reason];
  const look = looks[advice.reason];
  return (
    <section className="card day-card" style={{ background: look.color }}>
      <Sticker name={look.sticker} size={52} className="day-card-sticker" />
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
        {ready && advice.reason !== "goalAtRisk" && (
          <p className="day-card-ready">
            <strong>{t("Wieder fit:", "Ready again:")}</strong> {ready}
          </p>
        )}
      </div>
    </section>
  );
};
