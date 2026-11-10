import { useMemo, useState } from "react";
import { muscles, type Equipment, type Exercise, type Metric, type Muscle, type Pattern } from "../domain/exercises";
import { hasValue } from "../domain/stats";
import { Icon, Sheet } from "./components";
import { useApp } from "./context";
import { equipmentName, metricName, muscleName, patternName } from "./text";
import { Sticker } from "./stickers";

/** Equipment row: "all", the user's own exercises, or one equipment type. */
type EquipmentFilter = "all" | "recent" | Equipment;
/** Muscle row, combinable with the equipment row. */
type MuscleFilter = "all" | Muscle;

const equipmentOrder: Equipment[] = ["machine", "egym", "cable", "barbell", "dumbbell", "kettlebell", "bodyweight", "cardio", "other"];

const CustomExerciseForm = ({ onCreated, onCancel }: { onCreated: (key: string) => void; onCancel: () => void }) => {
  const { t, lang, actions } = useApp();
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("machine");
  const [metric, setMetric] = useState<Metric>("weight");
  const [pattern, setPattern] = useState<Pattern>("push");
  const [primary, setPrimary] = useState<Muscle[]>([]);
  const [secondary, setSecondary] = useState<Muscle[]>([]);
  const toggle = (list: Muscle[], m: Muscle) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);
  const equipments: Equipment[] = ["machine", "egym", "barbell", "dumbbell", "kettlebell", "cable", "bodyweight", "cardio", "other"];

  return (
    <div className="form">
      <label>
        {t("Name", "Name")}
        <input
          className="text-input"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder={t("z. B. Beinpresse 45°", "e.g. 45° leg press")}
        />
      </label>
      <label>
        {t("Gerät", "Equipment")}
        <select className="text-input" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
          {equipments.map((x) => (
            <option key={x} value={x}>
              {equipmentName(x, lang)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Erfassung", "Tracking")}
        <select className="text-input" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          {(["weight", "bodyweight", "time", "cardio"] as const).map((x) => (
            <option key={x} value={x}>
              {metricName(x, lang)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Bewegung", "Movement")}
        <select className="text-input" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
          {(["push", "pull", "legs", "core", "cardio"] as const).map((x) => (
            <option key={x} value={x}>
              {patternName(x, lang)}
            </option>
          ))}
        </select>
      </label>
      <div className="field-label">{t("Hauptmuskeln", "Primary muscles")}</div>
      <div className="chips">
        {muscles.map((m) => (
          <button key={m} className={`chip ${primary.includes(m) ? "selected" : ""}`} onClick={() => setPrimary(toggle(primary, m))}>
            {muscleName(m, lang)}
          </button>
        ))}
      </div>
      <div className="field-label">{t("Hilfsmuskeln", "Secondary muscles")}</div>
      <div className="chips">
        {muscles.map((m) => (
          <button
            key={m}
            className={`chip ${secondary.includes(m) ? "selected alt" : ""}`}
            onClick={() => setSecondary(toggle(secondary, m))}
          >
            {muscleName(m, lang)}
          </button>
        ))}
      </div>
      <div className="row gap">
        <button className="button" onClick={onCancel}>
          {t("Abbrechen", "Cancel")}
        </button>
        <button
          className="button dark grow"
          disabled={!name.trim()}
          onClick={() =>
            onCreated(
              actions.createCustomExercise({
                name,
                equipment,
                metric,
                pattern,
                primary,
                secondary: secondary.filter((m) => !primary.includes(m)),
              }),
            )
          }
        >
          {t("Übung anlegen", "Create exercise")}
        </button>
      </div>
    </div>
  );
};

export const ExercisePicker = ({
  onPick,
  onClose,
  exclude,
}: {
  onPick: (key: string) => void;
  onClose: () => void;
  exclude: ReadonlySet<string>;
}) => {
  const { t, lang, data, exerciseName } = useApp();
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<EquipmentFilter>("all");
  const [muscle, setMuscle] = useState<MuscleFilter>("all");
  const [creating, setCreating] = useState(false);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of data.workouts.slice(0, 60))
      for (const e of w.exercises) if (e.sets.some(hasValue)) map.set(e.exerciseKey, (map.get(e.exerciseKey) ?? 0) + 1);
    return map;
  }, [data]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (e: Exercise) => {
      if (q && !e.name.de.toLowerCase().includes(q) && !e.name.en.toLowerCase().includes(q)) return false;
      if (equipment === "recent" && !usage.has(e.key)) return false;
      if (equipment !== "all" && equipment !== "recent" && e.equipment !== equipment) return false;
      return muscle === "all" || e.primary.includes(muscle) || e.secondary.includes(muscle);
    };
    return [...data.exercises.values()]
      .filter(matches)
      .sort((a, b) => (usage.get(b.key) ?? 0) - (usage.get(a.key) ?? 0) || exerciseName(a).localeCompare(exerciseName(b), lang));
  }, [data, query, equipment, muscle, usage, exerciseName, lang]);

  if (creating)
    return (
      <Sheet title={t("Eigene Übung", "Custom exercise")} onClose={onClose}>
        <CustomExerciseForm onCreated={onPick} onCancel={() => setCreating(false)} />
      </Sheet>
    );

  // Only offer equipment types that actually have exercises (e.g. "other" for custom ones).
  const present = new Set([...data.exercises.values()].map((e) => e.equipment));
  const equipmentFilters: { value: EquipmentFilter; label: string }[] = [
    { value: "all", label: t("Alle", "All") },
    ...(usage.size > 0 ? [{ value: "recent" as const, label: t("Meine", "Mine") }] : []),
    ...equipmentOrder.filter((e) => present.has(e)).map((e) => ({ value: e, label: equipmentName(e, lang) })),
  ];
  const muscleFilters: { value: MuscleFilter; label: string }[] = [
    { value: "all", label: t("Alle Muskeln", "All muscles") },
    ...muscles.map((m) => ({ value: m, label: muscleName(m, lang) })),
  ];

  return (
    <Sheet title={t("Übung hinzufügen", "Add exercise")} onClose={onClose}>
      <input
        className="text-input search"
        placeholder={t("Suchen …", "Search …")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="chips scroll-x" role="group" aria-label={t("Gerät", "Equipment")}>
        {equipmentFilters.map((f) => (
          <button key={f.value} className={`chip ${equipment === f.value ? "selected" : ""}`} onClick={() => setEquipment(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="chips scroll-x" role="group" aria-label={t("Muskel", "Muscle")}>
        {muscleFilters.map((f) => (
          <button key={f.value} className={`chip ${muscle === f.value ? "selected alt" : ""}`} onClick={() => setMuscle(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      <button className="button full dashed" onClick={() => setCreating(true)}>
        <Icon name="plus" size={18} /> {t("Eigene Übung / Maschine anlegen", "Create custom exercise / machine")}
      </button>
      <div className="picker-list">
        {list.map((e) => (
          <button key={e.key} className={`picker-item ${exclude.has(e.key) ? "in-workout" : ""}`} onClick={() => onPick(e.key)}>
            <span className="list-main">
              <strong>{exerciseName(e)}</strong>
              <small>
                {equipmentName(e.equipment, lang)}
                {e.primary.length > 0 && ` · ${e.primary.map((m) => muscleName(m, lang)).join(", ")}`}
              </small>
            </span>
            {exclude.has(e.key) ? <Sticker name="ok" size={24} /> : <Icon name="plus" size={20} />}
          </button>
        ))}
        {list.length === 0 && <p className="hint">{t("Nichts gefunden.", "Nothing found.")}</p>}
      </div>
    </Sheet>
  );
};
