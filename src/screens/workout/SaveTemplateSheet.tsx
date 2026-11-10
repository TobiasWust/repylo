import { useState } from "react";
import type { Workout as WorkoutModel } from "../../domain/model";
import { Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { workoutToItems } from "../../ui/workoutOps";

export const SaveTemplateSheet = ({ workout, onClose }: { workout: WorkoutModel; onClose: () => void }) => {
  const { t, data, actions } = useApp();
  const { toast } = useFeedback();
  const [name, setName] = useState("");
  return (
    <Sheet title={t("Als Vorlage speichern", "Save as template")} onClose={onClose}>
      <p className="hint">{t("Vorlagen sind deine Splits (z. B. Push, Pull, Beine). Ihre Reihenfolge bestimmt, was als Nächstes vorgeschlagen wird.", "Templates are your splits (e.g. push, pull, legs). Their order decides what’s suggested next.")}</p>
      <input className="text-input" autoFocus placeholder={t("Name, z. B. Push", "Name, e.g. Push")} value={name} onChange={(e) => setName(e.target.value)} />
      <button
        className="button dark full"
        disabled={!name.trim()}
        onClick={() => {
          const id = actions.saveTemplate(data, name, workoutToItems(workout));
          if (!workout.templateId) actions.updateWorkout(workout.id, { templateId: id });
          toast(t("Vorlage gespeichert", "Template saved"));
          onClose();
        }}
      >
        {t("Speichern", "Save")}
      </button>
    </Sheet>
  );
};
