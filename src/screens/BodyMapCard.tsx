import { useMemo, useState } from "react";
import { addDays, today } from "../domain/dates";
import type { Muscle } from "../domain/exercises";
import { getExercise } from "../domain/model";
import { muscleDetail, muscleTarget } from "../domain/muscle";
import { muscleRecovery } from "../domain/recovery";
import { setsPerMuscle } from "../domain/stats";
import { formatNumber } from "../domain/units";
import { BodyMap } from "../ui/BodyMap";
import { Segmented } from "../ui/components";
import { useApp } from "../ui/context";
import { Sticker } from "../ui/stickers";
import { formatDate, muscleName } from "../ui/text";

type Mode = "volume" | "recovery";

const colors = { none: "var(--track)", low: "var(--pink)", some: "var(--yellow)", good: "var(--brand)", high: "var(--lavender)" };

/**
 * Body map with two views: weekly volume per muscle over the last four
 * weeks (vs. the goal's target) and recovery right now. Tapping a muscle
 * shows everything about it: volume, recovery, your exercises for it and,
 * if it falls short, exercises to add.
 */
export const BodyMapCard = () => {
  const { t, data, lang, open, exerciseName } = useApp();
  const [mode, setMode] = useState<Mode>("volume");
  const [selected, setSelected] = useState<Muscle | null>(null);
  const weekly = useMemo(() => {
    const sets = setsPerMuscle(data, addDays(today(), -27));
    return new Map([...sets].map(([m, n]) => [m, n / 4]));
  }, [data]);
  const recovery = useMemo(() => new Map(muscleRecovery(data).map((r) => [r.muscle, r])), [data]);
  const target = (m: Muscle) => muscleTarget(data, m);
  const info = useMemo(() => (selected ? muscleDetail(data, selected) : null), [data, selected]);

  const volumeLevel = (m: Muscle): keyof typeof colors => {
    const v = weekly.get(m) ?? 0;
    const [lo, hi] = target(m);
    return v === 0 ? "none" : v < lo! / 2 ? "low" : v < lo! ? "some" : v <= hi! ? "good" : "high";
  };
  const recoveryLevel = (m: Muscle): keyof typeof colors => {
    const h = recovery.get(m)?.hoursLeft ?? 0;
    return h === 0 ? "good" : h <= 24 ? "some" : "low";
  };
  const colorOf = (m: Muscle) => colors[mode === "volume" ? volumeLevel(m) : recoveryLevel(m)];

  const legend =
    mode === "volume"
      ? [
          ["none", t("gar nicht", "not at all")],
          ["low", t("kaum", "barely")],
          ["some", t("zu wenig", "too little")],
          ["good", t("im Ziel", "on target")],
          ["high", t("viel", "a lot")],
        ]
      : [
          ["good", t("erholt", "recovered")],
          ["some", t("≤ 1 Tag", "≤ 1 day")],
          ["low", t("braucht Ruhe", "needs rest")],
        ];

  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="muscle" /> {t("Körperkarte", "Body map")}
      </h2>
      <Segmented
        label={t("Ansicht", "View")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "volume", label: t("Volumen (4 Wo.)", "Volume (4 wk)") },
          { value: "recovery", label: t("Erholung jetzt", "Recovery now") },
        ]}
      />
      <BodyMap
        colorOf={colorOf}
        selected={selected}
        onSelect={setSelected}
        labels={{ front: t("vorne", "front"), back: t("hinten", "back") }}
      />
      <div className="body-legend">
        {legend.map(([level, label]) => (
          <span key={level}>
            <i style={{ background: colors[level as keyof typeof colors] }} />
            {label}
          </span>
        ))}
      </div>
      {info ? (
        <div className="muscle-detail">
          <h3>{muscleName(info.muscle, lang)}</h3>
          <div className="stat-grid">
            <div className={`stat-tile ${info.weeklyAverage < info.target[0] ? "pink" : "mint"}`}>
              <span>{t("Sätze pro Woche (Ø 4 Wo.)", "Sets per week (4-wk avg)")}</span>
              <strong>{formatNumber(info.weeklyAverage, lang, 1)}</strong>
              <small>
                {t("Ziel", "Target")} {formatNumber(info.target[0], lang, 0)}–{formatNumber(info.target[1], lang, 0)} ·{" "}
                {t("diese Woche", "this week")} {formatNumber(info.thisWeek, lang, 1)}
              </small>
            </div>
            <div className={`stat-tile ${info.recovery.hoursLeft > 0 ? "lavender" : "mint"}`}>
              <span>{t("Erholung", "Recovery")}</span>
              <strong>
                {info.recovery.hoursLeft > 0
                  ? t(`noch ${info.recovery.hoursLeft} h`, `${info.recovery.hoursLeft} h left`)
                  : t("bereit", "ready")}
              </strong>
              <small>
                {info.recovery.lastTrained
                  ? t(`zuletzt ${formatDate(info.recovery.lastTrained, lang)}`, `last ${formatDate(info.recovery.lastTrained, lang)}`)
                  : t("in den letzten Tagen nicht trainiert", "not trained in the last few days")}
              </small>
            </div>
          </div>
          {info.exercises.length > 0 && (
            <>
              <div className="field-label">{t("Deine Übungen dafür (8 Wochen)", "Your exercises for it (8 weeks)")}</div>
              <div className="stack tight">
                {info.exercises.map((e) => (
                  <button key={e.key} className="picker-item" onClick={() => open({ type: "exercise", key: e.key })}>
                    <span className="list-main">
                      <strong>{exerciseName(getExercise(data, e.key))}</strong>
                      <small>
                        {formatNumber(e.sets, lang, 1)} {t("Sätze", "sets")} · {t("zuletzt", "last")} {formatDate(e.lastDate, lang)}
                      </small>
                    </span>
                    <span className="chev">›</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {info.suggestions.length > 0 && (
            <>
              <div className="field-label">
                {info.exercises.length > 0
                  ? t("Für mehr Volumen, z. B.:", "For more volume, e.g.:")
                  : t("Noch keine Übung dafür – probier z. B.:", "No exercise for it yet – try e.g.:")}
              </div>
              <div className="chips">
                {info.suggestions.map((key) => (
                  <button key={key} className="chip" onClick={() => open({ type: "exercise", key })}>
                    {exerciseName(getExercise(data, key))}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="body-detail hint">{t("Tippe auf einen Muskel für Details.", "Tap a muscle for details.")}</p>
      )}
    </section>
  );
};
