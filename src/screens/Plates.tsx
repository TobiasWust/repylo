import { useState } from "react";
import { calculatePlates, platesKg, platesLb } from "../domain/plates";
import { formatNumber, fromUnit, toUnit } from "../domain/units";
import { NumberField, Sheet } from "../ui/components";
import { useApp } from "../ui/context";

const plateColor = (plate: number, unit: "kg" | "lb") => {
  const list: readonly number[] = unit === "kg" ? platesKg : platesLb;
  const colors = ["var(--pink)", "var(--sky)", "var(--yellow)", "var(--mint)", "var(--lavender)", "#ffffff", "#d9d9d9"];
  return colors[list.indexOf(plate)] ?? "#fff";
};

export const PlatesSheet = ({ initialWeight, onClose }: { initialWeight?: number; onClose: () => void }) => {
  const { t, data, actions, lang } = useApp();
  const unit = data.settings.unit;
  const [target, setTarget] = useState<number | null>(initialWeight ? Math.round(toUnit(initialWeight, unit) * 10) / 10 : unit === "kg" ? 60 : 135);
  const bar = Math.round(toUnit(data.settings.barWeight, unit) * 10) / 10;
  const result = calculatePlates(target ?? 0, bar, unit);
  const maxPlate = unit === "kg" ? 25 : 45;

  return (
    <Sheet title={t("Scheibenrechner", "Plate calculator")} onClose={onClose}>
      <div className="row gap">
        <label className="grow">
          {t("Zielgewicht", "Target")} ({unit})
          <NumberField label={t("Zielgewicht", "Target")} value={target} onCommit={setTarget} className="big-input" />
        </label>
        <label className="grow">
          {t("Stange", "Bar")} ({unit})
          <NumberField label={t("Stange", "Bar")} value={bar} onCommit={(v) => v != null && actions.updateSettings({ barWeight: fromUnit(v, unit) })} className="big-input" />
        </label>
      </div>
      <div className="barbell">
        <div className="bar-sleeve" />
        {[...result.perSide].reverse().map((p, i) => (
          <div key={`l${i}`} className="plate" style={{ height: `${40 + (p / maxPlate) * 80}px`, background: plateColor(p, unit) }}>
            {formatNumber(p, lang, 2)}
          </div>
        ))}
        <div className="bar-center" />
        {result.perSide.map((p, i) => (
          <div key={`r${i}`} className="plate" style={{ height: `${40 + (p / maxPlate) * 80}px`, background: plateColor(p, unit) }}>
            {formatNumber(p, lang, 2)}
          </div>
        ))}
        <div className="bar-sleeve" />
      </div>
      <p className="center">
        {result.perSide.length === 0
          ? t("Nur die Stange.", "Just the bar.")
          : t(`Pro Seite: ${result.perSide.map((p) => formatNumber(p, lang, 2)).join(" + ")} ${unit}`, `Per side: ${result.perSide.map((p) => formatNumber(p, lang, 2)).join(" + ")} ${unit}`)}
      </p>
      {result.remainder > 0 && (
        <p className="hint center">{t(`${formatNumber(result.remainder * 2, lang, 2)} ${unit} lassen sich nicht genau stecken.`, `${formatNumber(result.remainder * 2, lang, 2)} ${unit} can’t be loaded exactly.`)}</p>
      )}
    </Sheet>
  );
};
