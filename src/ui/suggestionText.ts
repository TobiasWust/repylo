/** Words, colours and stickers for suggestion cards, and the evidence behind each hint. */
import type { BalanceKey } from "../domain/balance";
import type { Muscle } from "../domain/exercises";
import { getExercise } from "../domain/model";
import type { Suggestion } from "../domain/suggestions";
import { balanceSides } from "./balance";
import type { App } from "./context";
import type { StickerName } from "./stickers";
import { formatDate, isPluralMuscle, muscleName } from "./text";

export const cardColors: Record<Suggestion["kind"], string> = {
  split: "var(--yellow)",
  neglected: "var(--pink)",
  missing: "var(--lavender)",
  imbalance: "var(--mint)",
  plateau: "var(--sky)",
  deload: "var(--lavender)",
  comeback: "var(--yellow)",
  overVolume: "var(--pink)",
  crammed: "var(--lavender)",
  similar: "var(--sky)",
  variety: "var(--mint)",
  stretch: "var(--mint)",
  easy: "var(--pink)",
  repRange: "var(--sky)",
  order: "var(--yellow)",
  jump: "var(--pink)",
  long: "var(--lavender)",
  unchecked: "var(--sky)",
};

export const cardSticker: Record<Suggestion["kind"], StickerName> = {
  split: "repeat",
  neglected: "target",
  missing: "hourglass",
  imbalance: "balance",
  plateau: "chartUp",
  deload: "scale",
  comeback: "party",
  overVolume: "warn",
  crammed: "calendar",
  similar: "repeat",
  variety: "target",
  stretch: "muscle",
  easy: "flame",
  repRange: "dumbbell",
  order: "medal",
  jump: "bolt",
  long: "hourglass",
  unchecked: "note",
};

export const suggestionText = (s: Suggestion, app: App): { title: string; text: string } => {
  const { t, lang, data, exerciseName } = app;
  const p = s.params;
  const ex = (key: string | number | undefined) => exerciseName(getExercise(data, String(key)));
  const muscle = p.muscle ? muscleName(p.muscle as Muscle, lang) : "";
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
        title: t(
          `${muscle} ${isPluralMuscle(p.muscle as Muscle, lang) ? "kommen" : "kommt"} zu kurz`,
          `${muscle} ${isPluralMuscle(p.muscle as Muscle, lang) ? "need" : "needs"} work`,
        ),
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
    case "comeback":
      return {
        title: t("Willkommen zurück!", "Welcome back!"),
        text: t(
          `${p.weeks} Wochen Pause. Starte heute etwas leichter – die Gewichte im Training sind schon angepasst.`,
          `${p.weeks} weeks off. Start a bit lighter today – the weights in your workout are already adjusted.`,
        ),
      };
    case "overVolume":
      return {
        title: t(`${muscle}: weniger Sätze`, `${muscle}: fewer sets`),
        text: t(
          `${p.sets} Sätze in 7 Tagen. Streich ${Number(p.sets) - Number(p.upper)} davon – mehr als ~${p.upper} bringen kaum noch etwas.`,
          `${p.sets} sets in 7 days. Cut ${Number(p.sets) - Number(p.upper)} of them – beyond ~${p.upper} adds little.`,
        ),
      };
    case "crammed":
      return {
        title: t(`${muscle} auf zwei Tage verteilen`, `Split ${muscle.toLowerCase()} over two days`),
        text: t(
          `${p.sets} Sätze in einer Einheit. Mach die Hälfte davon an einem anderen Tag.`,
          `${p.sets} sets in one session. Do half of them on another day.`,
        ),
      };
    case "similar":
      return {
        title: t("Eine Übung tauschen", "Swap one exercise"),
        text: t(
          `${ex(p.first)} und ${ex(p.second)} trainieren fast dasselbe.${s.exerciseKeys.length ? " Ersetze eine durch:" : " Ersetze eine durch eine andere Bewegung."}`,
          `${ex(p.first)} and ${ex(p.second)} train almost the same.${s.exerciseKeys.length ? " Replace one with:" : " Replace one with another movement."}`,
        ),
      };
    case "variety":
      return {
        title: t(`${muscle}: neue Übung dazunehmen`, `${muscle}: add another exercise`),
        text: t("Seit 4 Wochen nur eine Bewegung. Nimm eine davon dazu:", "Only one movement for 4 weeks. Add one of these:"),
      };
    case "stretch":
      return {
        title: t(`${muscle} in Dehnung trainieren`, `Train ${muscle.toLowerCase()} in a stretch`),
        text: t(
          `Bisher nur ${ex(p.exercise)}. Ersetze einen Teil der Sätze durch:`,
          `So far only ${ex(p.exercise)}. Replace some sets with:`,
        ),
      };
    case "easy":
      return {
        title: t("Näher ans Limit gehen", "Get closer to your limit"),
        text: t(
          `${p.easy} von ${p.total} Übungen waren „leicht“. Nimm mehr Gewicht, bis am Satzende nur noch 1–3 Wiederholungen gehen.`,
          `${p.easy} of ${p.total} exercises felt “easy”. Add weight until only 1–3 reps are left at the end of a set.`,
        ),
      };
    case "repRange":
      return p.goal === "strength"
        ? {
            title: t("Grundübungen schwerer machen", "Go heavier on main lifts"),
            text: t(
              "Kaum Sätze mit 6 oder weniger Wiederholungen. Wähl bei Grundübungen ein Gewicht für 3–6 Wiederholungen.",
              "Hardly any sets of 6 reps or fewer. Pick a weight for 3–6 reps on your main lifts.",
            ),
          }
        : {
            title: t("Mehr Gewicht nehmen", "Use more weight"),
            text: t(
              "Meist über 30 Wiederholungen. Nimm so viel Gewicht, dass du 8–12 schaffst.",
              "Mostly over 30 reps. Use enough weight that you manage 8–12.",
            ),
          };
    case "order":
      return {
        title: t(`${ex(p.exercise)} früher machen`, `Do ${ex(p.exercise)} earlier`),
        text:
          p.goal === "strength"
            ? t(
                "Kam zuletzt nach kleineren Übungen. Zieh sie im Training an den Anfang.",
                "Came after smaller exercises lately. Drag it to the start of your workout.",
              )
            : t(
                `Kam zuletzt erst nach ${p.before} Übungen. Zieh sie im Training weiter nach vorn.`,
                `Came after ${p.before} exercises lately. Drag it further up in your workout.`,
              ),
      };
    case "jump":
      return {
        title: t("Sätze härter machen", "Make your sets harder"),
        text: t(
          `Bei ${p.count} Übungen bist du plötzlich 15 % und mehr stärker (${ex(p.exercise)}: +${p.percent} %) – die Sätze davor waren zu leicht. Hör erst auf, wenn nur noch 1–3 Wiederholungen gingen${p.rated ? "." : ", und schalte in den Einstellungen „Nach Anstrengung fragen“ ein."}`,
          `On ${p.count} exercises you're suddenly 15 % or more stronger (${ex(p.exercise)}: +${p.percent} %) – earlier sets were too easy. Only stop when 1–3 reps are left${p.rated ? "." : ", and turn on “Ask how it felt” in Settings."}`,
        ),
      };
    case "long":
      return {
        title: t("Training aufteilen", "Split your workout"),
        text: t(
          `Zuletzt ~${p.minutes} Minuten mit ${p.sets} Sätzen. Verteil die Übungen auf mehr, kürzere Einheiten, z. B. Ober- und Unterkörper.`,
          `Lately ~${p.minutes} minutes with ${p.sets} sets. Spread the exercises over more, shorter sessions, e.g. upper and lower body.`,
        ),
      };
    case "unchecked":
      return {
        title: t(`Training vom ${formatDate(String(p.date), lang)} prüfen`, `Check the workout from ${formatDate(String(p.date), lang)}`),
        text: t(
          "Nichts abgehakt und gleich beendet. Hak die Sätze ab oder lösch das Training.",
          "Nothing ticked off and closed right away. Tick off the sets or delete the workout.",
        ),
      };
  }
};

/** One or two sentences on the research behind a hint, with sources. Null for the plain bookkeeping cards. */
export const whyText = (s: Suggestion, app: App): string | null => {
  const { t } = app;
  switch (s.kind) {
    case "comeback":
      return t(
        "Kraft hält sich etwa drei Wochen und kommt danach schnell zurück. Leichter starten schont Sehnen und Gelenke. (Bosquet et al. 2013; Ogasawara et al. 2013)",
        "Strength holds for about three weeks and comes back quickly after. Starting lighter spares tendons and joints. (Bosquet et al. 2013; Ogasawara et al. 2013)",
      );
    case "overVolume":
      return t(
        "Jeder weitere Satz bringt weniger zusätzliches Wachstum, kostet aber Erholung. (Schoenfeld et al. 2017; Pelland et al. 2024)",
        "Each extra set adds less growth but still costs recovery. (Schoenfeld et al. 2017; Pelland et al. 2024)",
      );
    case "crammed":
      return t(
        "Bei gleichem Wochenvolumen wachsen Muskeln mit ein oder zwei Einheiten gleich gut – verteilt bleiben die Sätze frischer. (Schoenfeld et al. 2019)",
        "With the same weekly volume, muscles grow equally with one or two sessions – spread out, sets stay fresher. (Schoenfeld et al. 2019)",
      );
    case "similar":
    case "variety":
      return t(
        "Verschiedene Übungen trainieren verschiedene Bereiche eines Muskels. Abwechslung lässt ihn gleichmäßiger wachsen. (Fonseca et al. 2014; Kassiano et al. 2022)",
        "Different exercises train different regions of a muscle. Variety grows it more evenly. (Fonseca et al. 2014; Kassiano et al. 2022)",
      );
    case "stretch": {
      const source: Partial<Record<string, string>> = {
        triceps: "Maeo et al. 2023",
        hamstrings: "Maeo et al. 2021",
        calves: "Kinoshita et al. 2023",
      };
      return t(
        `Unter Last gedehnte Muskeln wuchsen in Studien deutlich mehr. (${source[String(s.params.muscle)] ?? "Wolf et al. 2023"})`,
        `Muscles loaded in a stretch grew clearly more in studies. (${source[String(s.params.muscle)] ?? "Wolf et al. 2023"})`,
      );
    }
    case "easy":
    case "jump":
      return t(
        "Sätze, die nah am Limit enden, bringen deutlich mehr Muskelaufbau als lockere. (Refalo et al. 2023; Robinson et al. 2024)",
        "Sets that end close to your limit build clearly more muscle than easy ones. (Refalo et al. 2023; Robinson et al. 2024)",
      );
    case "repRange":
      return s.params.goal === "strength"
        ? t(
            "Muskeln wachsen mit leichten und schweren Gewichten, Maximalkraft aber vor allem mit schweren. (Schoenfeld et al. 2017; Lopez et al. 2021)",
            "Muscles grow with light and heavy weights, but max strength mostly with heavy ones. (Schoenfeld et al. 2017; Lopez et al. 2021)",
          )
        : t(
            "Mit sehr leichten Gewichten wachsen Muskeln weniger zuverlässig. (Schoenfeld et al. 2017; Lasevicius et al. 2018)",
            "With very light weights, muscles grow less reliably. (Schoenfeld et al. 2017; Lasevicius et al. 2018)",
          );
    case "order":
      return s.params.goal === "strength"
        ? t(
            "Übungen am Anfang einer Einheit legen mehr Kraft zu. (Nunes et al. 2021)",
            "Exercises early in a session gain more strength. (Nunes et al. 2021)",
          )
        : t(
            "Am Ende einer langen Einheit schaffst du weniger Wiederholungen. (Simão et al. 2012)",
            "At the end of a long session you get fewer reps. (Simão et al. 2012)",
          );
    case "long":
      return t(
        "Fürs Wachstum zählt das Wochenvolumen, nicht die Zahl der Einheiten – und am Ende langer Einheiten fehlt die Kraft. (Schoenfeld et al. 2019; Simão et al. 2012)",
        "Growth depends on weekly volume, not the number of sessions – and strength fades at the end of long ones. (Schoenfeld et al. 2019; Simão et al. 2012)",
      );
    default:
      return null;
  }
};
