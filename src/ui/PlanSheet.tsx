import { useState } from "react";
import { getExercise } from "../domain/model";
import { generateCircuit, generatePlan, type Place } from "../domain/planner";
import { Icon, Segmented, Sheet } from "./components";
import { useApp } from "./context";
import { useFeedback } from "./feedback";
import { goalName } from "./text";

/** Plan assistant: pick days and place, preview the split, save it as templates. */
export const PlanSheet = ({ onClose }: { onClose: () => void }) => {
  const { t, data, actions, lang, exerciseName } = useApp();
  const { toast } = useFeedback();
  const [days, setDays] = useState(String(Math.min(6, Math.max(2, data.settings.weeklyGoal))));
  const [place, setPlace] = useState<Place>("gym");
  const [replace, setReplace] = useState(true);
  const [style, setStyle] = useState<"split" | "circuit">("split");
  const plan =
    style === "circuit"
      ? [generateCircuit(data, place, data.settings.goal, lang)]
      : generatePlan(data, Number(days), place, data.settings.goal, lang);

  return (
    <Sheet title={t("Trainingsplan erstellen", "Create a training plan")} onClose={onClose}>
      <p className="hint">
        {t(
          `Für dein Ziel „${goalName(data.settings.goal, lang)}“ (änderbar unter Mehr → Training). Der Plan wird als Vorlagen gespeichert, „Als Nächstes dran“ führt dich dann durch.`,
          `For your goal “${goalName(data.settings.goal, lang)}” (change it under More → Training). The plan is saved as templates; “Up next” then guides you through.`,
        )}
      </p>
      <div className="field-label">{t("Art", "Type")}</div>
      <Segmented
        value={style}
        onChange={(next) => {
          setStyle(next);
          // A circuit is usually added next to an existing split, a new split replaces the old one.
          setReplace(next === "split");
        }}
        options={[
          { value: "split", label: t("Split", "Split") },
          { value: "circuit", label: t("Zirkel", "Circuit") },
        ]}
      />
      <p className="hint">
        {style === "split"
          ? t(
              "Verschiedene Trainingstage im Wechsel, z. B. Oberkörper und Unterkörper.",
              "Different training days in rotation, e.g. upper and lower body.",
            )
          : t(
              "Ein Ganzkörper-Durchgang: alle Übungen direkt nacheinander mit kurzen Pausen, insgesamt 3 Runden. Gut bei wenig Zeit und für Gerätezirkel.",
              "One full-body round: all exercises back to back with short rests, 3 rounds in total. Great when short on time and for machine circuits.",
            )}
      </p>
      <div className="field-label">{t("Trainingstage pro Woche", "Training days per week")}</div>
      <Segmented value={days} onChange={setDays} options={["2", "3", "4", "5", "6"].map((v) => ({ value: v, label: v }))} />
      <div className="field-label">{t("Wo trainierst du?", "Where do you train?")}</div>
      <Segmented
        value={place}
        onChange={setPlace}
        options={[
          { value: "gym", label: t("Studio", "Gym") },
          { value: "egym", label: "EGYM" },
          { value: "home", label: t("Zuhause", "Home") },
        ]}
      />
      <div className="stack tight">
        {plan.map((p) => (
          <div key={p.name} className="card plan-day">
            <strong>{p.name}</strong>
            <small>{p.items.map((i) => exerciseName(getExercise(data, i.exerciseKey))).join(" · ")}</small>
          </div>
        ))}
      </div>
      {data.templates.length > 0 && (
        <label className="check-line">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          <span>
            {t(
              data.templates.length === 1 ? "Bisherige Vorlage ersetzen" : `Die ${data.templates.length} bisherigen Vorlagen ersetzen`,
              data.templates.length === 1 ? "Replace the existing template" : `Replace the ${data.templates.length} existing templates`,
            )}
          </span>
        </label>
      )}
      <button
        className="button dark big full"
        onClick={() => {
          actions.savePlan(data, plan, replace);
          actions.updateSettings({ weeklyGoal: Number(days) });
          toast(t("Plan gespeichert – los geht's!", "Plan saved – let's go!"));
          onClose();
        }}
      >
        <Icon name="check" /> {t("Plan übernehmen", "Use this plan")}
      </button>
    </Sheet>
  );
};
