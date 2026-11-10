import { useMemo, useState } from "react";
import { addDays, today } from "../../domain/dates";
import { minorMuscles, type Muscle } from "../../domain/exercises";
import { muscleRecovery } from "../../domain/recovery";
import { setsPerMuscle, weeklySetTarget } from "../../domain/stats";
import { formatNumber } from "../../domain/units";
import { BodyMap } from "../../ui/BodyMap";
import { Segmented } from "../../ui/components";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";
import { formatDate, muscleName } from "../../ui/text";

type Mode = "volume" | "recovery";

const colors = { none: "#ecece6", low: "var(--pink)", some: "var(--yellow)", good: "var(--bg)", high: "var(--lavender)" };

/**
 * Body map with two views: weekly volume per muscle over the last four
 * weeks (vs. the goal's target) and recovery right now.
 */
export const BodyCard = () => {
  const { t, data, lang } = useApp();
  const [mode, setMode] = useState<Mode>("volume");
  const [selected, setSelected] = useState<Muscle | null>(null);
  const weekly = useMemo(() => {
    const sets = setsPerMuscle(data, addDays(today(), -27));
    return new Map([...sets].map(([m, n]) => [m, n / 4]));
  }, [data]);
  const recovery = useMemo(() => new Map(muscleRecovery(data).map((r) => [r.muscle, r])), [data]);
  const [min, max] = weeklySetTarget[data.settings.goal];
  // Small muscles get plenty of indirect work, so their target is half.
  const target = (m: Muscle) => (minorMuscles.has(m) ? [min / 2, max / 2] : [min, max]);

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

  const detail = (m: Muscle) => {
    if (mode === "volume") {
      const [lo, hi] = target(m);
      return t(
        `Ø ${formatNumber(weekly.get(m) ?? 0, lang, 1)} Sätze pro Woche (Ziel ${lo}–${hi})`,
        `Avg ${formatNumber(weekly.get(m) ?? 0, lang, 1)} sets per week (target ${lo}–${hi})`,
      );
    }
    const r = recovery.get(m);
    const last = r?.lastTrained ? t(` · zuletzt ${formatDate(r.lastTrained, lang)}`, ` · last ${formatDate(r.lastTrained, lang)}`) : "";
    if (!r || r.hoursLeft === 0) return t("Erholt – bereit für Training", "Recovered – ready to train") + last;
    return t(`Erholt sich noch ca. ${r.hoursLeft} h`, `Still recovering for about ${r.hoursLeft} h`) + last;
  };

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
      <p className="body-detail">
        {selected ? (
          <>
            <strong>{muscleName(selected, lang)}:</strong> {detail(selected)}
          </>
        ) : (
          <span className="hint">{t("Tippe auf einen Muskel für Details.", "Tap a muscle for details.")}</span>
        )}
      </p>
    </section>
  );
};
