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
          `${p.weeks} Wochen Pause – kein Problem. Die Vorschläge im Training starten diesmal etwas leichter, damit du sauber wieder reinkommst.`,
          `${p.weeks} weeks off – no problem. Today's suggested weights start a bit lighter so you can ease back in.`,
        ),
      };
    case "overVolume":
      return {
        title: t(`${muscle}: sehr viele Sätze`, `${muscle}: a lot of sets`),
        text: t(
          `~${p.sets} Sätze in 7 Tagen. Über ~${p.upper} pro Woche bringt kaum noch zusätzliches Wachstum, kostet aber Erholung. Ein paar Sätze weniger reichen.`,
          `~${p.sets} sets in 7 days. Beyond ~${p.upper} a week adds little growth but costs recovery. A few sets fewer will do.`,
        ),
      };
    case "crammed":
      return {
        title: t(`${muscle}: alles an einem Tag`, `${muscle}: all in one day`),
        text: t(
          `${p.sets} Sätze in einer Einheit. Verteil sie lieber auf zwei Tage – das bringt mindestens genauso viel, und jede Einheit bleibt frischer.`,
          `${p.sets} sets in one session. Split them over two days – it works at least as well and keeps each session fresher.`,
        ),
      };
    case "similar": {
      const more = Number(p.count) > 2 ? t(` (+${Number(p.count) - 2})`, ` (+${Number(p.count) - 2})`) : "";
      return {
        title: t("Sehr ähnliche Übungen", "Very similar exercises"),
        text: t(
          `${ex(p.first)} und ${ex(p.second)}${more} trainieren fast dasselbe. Tausch eine gegen eine Übung aus einem anderen Winkel${s.exerciseKeys.length ? ", z. B.:" : "."}`,
          `${ex(p.first)} and ${ex(p.second)}${more} train almost the same thing. Swap one for an exercise from a different angle${s.exerciseKeys.length ? ", e.g.:" : "."}`,
        ),
      };
    }
    case "variety":
      return {
        title: t(`${muscle}: immer dieselbe Bewegung`, `${muscle}: always the same movement`),
        text: t(
          "In vier Wochen nur eine Art von Übung. Eine zweite Bewegung trifft den Muskel aus einem anderen Winkel.",
          "Only one kind of exercise in four weeks. A second movement hits the muscle from another angle.",
        ),
      };
    case "stretch": {
      const how: Partial<Record<Muscle, [string, string]>> = {
        triceps: ["Überkopf-Übungen dehnen den langen Trizepskopf", "Overhead exercises stretch the long head"],
        hamstrings: [
          "Beinbeuger sitzend oder rumänisches Kreuzheben dehnen ihn über die Hüfte",
          "Seated leg curls or RDLs stretch them over the hip",
        ],
        calves: [
          "Wadenheben mit gestrecktem Knie dehnt den großen Wadenmuskel",
          "Calf raises with straight knees stretch the big calf muscle",
        ],
      };
      const [de, en] = how[p.muscle as Muscle] ?? ["Übungen in Dehnung", "Exercises in a stretch"];
      return {
        title: t(`${muscle} in Dehnung trainieren`, `Train ${muscle.toLowerCase()} in a stretch`),
        text: t(
          `Bisher mit ${ex(p.exercise)}. ${de} – in Studien wuchs der Muskel damit deutlich mehr.`,
          `So far with ${ex(p.exercise)}. ${en} – in studies, the muscle grew clearly more.`,
        ),
      };
    }
    case "easy":
      return {
        title: t("Meist zu leicht?", "Mostly too easy?"),
        text: t(
          `${p.easy} von ${p.total} Übungen hast du zuletzt als „leicht“ markiert. Fürs Wachstum sollten am Ende jedes Satzes nur noch 1–3 Wiederholungen übrig sein.`,
          `You marked ${p.easy} of ${p.total} exercises as “easy” lately. For growth, end each set with only 1–3 reps left in the tank.`,
        ),
      };
    case "repRange":
      return p.goal === "strength"
        ? {
            title: t("Für Kraft: schwerer werden", "For strength: go heavier"),
            text: t(
              "Bei deinen Grundübungen hattest du zuletzt kaum Sätze mit 6 oder weniger Wiederholungen. Maximalkraft wächst am meisten mit schweren Gewichten.",
              "Your main lifts had hardly any sets of 6 reps or fewer lately. Max strength grows most with heavy weights.",
            ),
          }
        : {
            title: t("Sehr leichte Gewichte", "Very light weights"),
            text: t(
              "Die meisten Sätze hatten über 30 Wiederholungen. Etwas mehr Gewicht für 6–30 Wiederholungen bringt zuverlässiger Muskelaufbau.",
              "Most sets had more than 30 reps. A bit more weight for 6–30 reps builds muscle more reliably.",
            ),
          };
    case "order":
      return {
        title: t(`${ex(p.exercise)} früher machen`, `Do ${ex(p.exercise)} earlier`),
        text:
          p.goal === "strength"
            ? t(
                "Du machst sie meist nach mehreren kleineren Übungen. Was am Anfang steht, gewinnt am meisten Kraft – zieh sie im Training nach oben.",
                "You usually do it after several smaller exercises. What comes first gains the most strength – drag it up in your workout.",
              )
            : t(
                `Sie kommt bei dir erst nach ${p.before} anderen Übungen. Müde schaffst du bei schweren Grundübungen weniger – zieh sie im Training weiter nach oben.`,
                `It comes after ${p.before} other exercises. Tired, you get fewer reps on heavy compound lifts – drag it further up in your workout.`,
              ),
      };
    case "jump":
      return {
        title: t("Plötzlich viel stärker?", "Suddenly much stronger?"),
        text: t(
          `Bei ${p.count} Übungen ist deine geschätzte Maximalkraft von einem Training aufs nächste um 15 % oder mehr gestiegen (${ex(p.exercise)}: +${p.percent} %). So schnell wächst Kraft nicht – die Sätze davor waren wohl weit vom Limit entfernt. ${
            p.rated
              ? "Sag nach jeder Übung, wie sie sich angefühlt hat, dann passt repylo die Vorschläge an."
              : "Schalte in den Einstellungen „Nach Anstrengung fragen“ ein, dann passt repylo die Vorschläge an."
          }`,
          `On ${p.count} exercises your estimated max jumped 15 % or more from one workout to the next (${ex(p.exercise)}: +${p.percent} %). Strength doesn't grow that fast – the earlier sets were probably far from your limit. ${
            p.rated
              ? "Rate how each exercise felt and repylo will adjust its suggestions."
              : "Turn on “Ask how it felt” in Settings and repylo will adjust its suggestions."
          }`,
        ),
      };
    case "long":
      return {
        title: t("Sehr lange Einheiten", "Very long sessions"),
        text: t(
          `Deine letzten Trainings dauerten im Schnitt ${p.minutes} Minuten mit ~${p.sets} Sätzen. Auf mehr, kürzere Einheiten verteilt (z. B. Ober- und Unterkörper) bleibt das Wochenvolumen gleich – und die letzten Übungen leiden nicht unter Müdigkeit.`,
          `Your last workouts took ${p.minutes} minutes on average with ~${p.sets} sets. Spread over more, shorter sessions (e.g. upper and lower body), the weekly volume stays the same – and the last exercises don't suffer from fatigue.`,
        ),
      };
    case "unchecked":
      return {
        title: t(`Training vom ${formatDate(String(p.date), lang)} prüfen`, `Check the workout from ${formatDate(String(p.date), lang)}`),
        text: t(
          "Kein Satz abgehakt und nach einer Minute beendet. Hast du das so trainiert? Sonst verfälscht es deine Statistik.",
          "No set ticked off and closed after a minute. Did you train it like that? Otherwise it skews your stats.",
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
        "Kraft hält sich etwa drei Wochen ohne Training und sinkt danach nur langsam – beim Wiedereinstieg kommt sie schnell zurück. Ein leichterer Start schont Sehnen und Gelenke. (Bosquet et al. 2013, Meta-Analyse; Ogasawara et al. 2013)",
        "Strength holds for about three weeks without training and fades slowly after that – it comes back quickly once you restart. Starting lighter spares tendons and joints. (Bosquet et al. 2013, meta-analysis; Ogasawara et al. 2013)",
      );
    case "overVolume":
      return t(
        "Mehr Sätze bringen mehr Muskelwachstum, aber der Zusatznutzen wird mit jedem Satz kleiner. Sehr hohe Wochenvolumen lohnen sich selten. (Schoenfeld et al. 2017; Pelland et al. 2024, Meta-Analysen)",
        "More sets mean more growth, but each extra set adds less. Very high weekly volumes rarely pay off. (Schoenfeld et al. 2017; Pelland et al. 2024, meta-analyses)",
      );
    case "crammed":
      return t(
        "Bei gleichem Wochenvolumen ist es fürs Wachstum fast egal, ob ein Muskel ein- oder zweimal pro Woche trainiert wird. Viele Sätze am Stück werden gegen Ende aber schwächer. (Schoenfeld et al. 2019, Meta-Analyse)",
        "With the same weekly volume, training a muscle once or twice a week makes little difference for growth. Many sets in a row get weaker towards the end, though. (Schoenfeld et al. 2019, meta-analysis)",
      );
    case "similar":
    case "variety":
      return t(
        "Verschiedene Übungen belasten unterschiedliche Bereiche eines Muskels. Abwechslung bei der Übungsauswahl führt zu gleichmäßigerem Wachstum als immer dieselbe Bewegung. (Fonseca et al. 2014; Kassiano et al. 2022, systematische Übersicht)",
        "Different exercises load different regions of a muscle. Varied exercise selection grows muscles more evenly than repeating one movement. (Fonseca et al. 2014; Kassiano et al. 2022, systematic review)",
      );
    case "stretch": {
      const source: Partial<Record<string, string>> = {
        triceps: "Maeo et al. 2023",
        hamstrings: "Maeo et al. 2021",
        calves: "Kinoshita et al. 2023",
      };
      return t(
        `Muskeln, die unter Last stark gedehnt werden, wachsen in Studien oft deutlich mehr als bei Übungen, die sie nur im verkürzten Bereich belasten. (${source[String(s.params.muscle)] ?? "Wolf et al. 2023"}; Übersicht: Wolf et al. 2023)`,
        `Muscles loaded in a deep stretch often grew clearly more in studies than with exercises that only load them short. (${source[String(s.params.muscle)] ?? "Wolf et al. 2023"}; review: Wolf et al. 2023)`,
      );
    }
    case "easy":
      return t(
        "Je näher ein Satz am Muskelversagen endet, desto mehr Wachstum – bis etwa 0–3 Wiederholungen Reserve. Weit davon entfernt bringt deutlich weniger. (Refalo et al. 2023; Robinson et al. 2024, Meta-Analysen)",
        "The closer a set ends to failure, the more growth – down to about 0–3 reps in reserve. Stopping far from it brings clearly less. (Refalo et al. 2023; Robinson et al. 2024, meta-analyses)",
      );
    case "repRange":
      return s.params.goal === "strength"
        ? t(
            "Muskelaufbau klappt mit leichten und schweren Gewichten etwa gleich gut, Maximalkraft steigt mit schweren Lasten aber deutlich stärker. (Schoenfeld et al. 2017; Lopez et al. 2021, Meta-Analysen)",
            "Muscle grows about equally with light and heavy weights, but max strength rises clearly more with heavy loads. (Schoenfeld et al. 2017; Lopez et al. 2021, meta-analyses)",
          )
        : t(
            "Zwischen etwa 6 und 30 Wiederholungen nahe am Versagen wachsen Muskeln ähnlich gut. Mit sehr leichten Gewichten ist der Effekt kleiner. (Schoenfeld et al. 2017; Lasevicius et al. 2018)",
            "Between about 6 and 30 reps near failure, muscles grow similarly. With very light weights the effect is smaller. (Schoenfeld et al. 2017; Lasevicius et al. 2018)",
          );
    case "order":
      return s.params.goal === "strength"
        ? t(
            "Übungen am Anfang einer Einheit zeigen größere Kraftzuwächse als dieselben Übungen am Ende. Für den Muskelaufbau ist die Reihenfolge fast egal. (Nunes et al. 2021, Meta-Analyse)",
            "Exercises done early in a session gain more strength than the same exercises done last. For muscle growth, the order hardly matters. (Nunes et al. 2021, meta-analysis)",
          )
        : t(
            "Für den Muskelaufbau ist die Reihenfolge laut Studien zweitrangig. Übungen am Ende einer langen Einheit schaffen aber weniger Wiederholungen und Gewicht als dieselben am Anfang. (Simão et al. 2012, Übersicht; Nunes et al. 2021, Meta-Analyse)",
            "For muscle growth, studies find the order matters little. But exercises at the end of a long session get fewer reps and less weight than the same ones done first. (Simão et al. 2012, review; Nunes et al. 2021, meta-analysis)",
          );
    case "jump":
      return t(
        "repylo schätzt deine Maximalkraft aus Gewicht und Wiederholungen. Das stimmt nur, wenn ein Satz nah am Limit endet. Springt die Schätzung plötzlich, waren die Sätze davor weit davon entfernt – und Sätze nah am Limit bringen deutlich mehr Muskelaufbau. (Refalo et al. 2023; Robinson et al. 2024, Meta-Analysen)",
        "repylo estimates your max from weight and reps. That only holds when a set ends close to your limit. If the estimate suddenly jumps, earlier sets were far from it – and sets close to the limit build clearly more muscle. (Refalo et al. 2023; Robinson et al. 2024, meta-analyses)",
      );
    case "long":
      return t(
        "Bei gleichem Wochenvolumen ist es fürs Wachstum fast egal, auf wie viele Einheiten du es verteilst. Übungen am Ende einer langen Einheit schaffen aber weniger Wiederholungen. (Schoenfeld et al. 2019, Meta-Analyse; Simão et al. 2012, Übersicht)",
        "With the same weekly volume, it hardly matters for growth how many sessions you split it into. But exercises at the end of a long session get fewer reps. (Schoenfeld et al. 2019, meta-analysis; Simão et al. 2012, review)",
      );
    default:
      return null;
  }
};
