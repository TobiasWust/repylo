import { useMemo, useState } from "react";
import { balanceChecks, imbalances, type BalanceCheck } from "../../domain/balance";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";
import { balanceSides as sides, type BalanceSide as Side } from "../../ui/balance";
import { RatioBar } from "./RatioBar";

export const BalanceCard = () => {
  const { t, data, lang } = useApp();
  const checks = useMemo(() => balanceChecks(data), [data]);
  const off = imbalances(checks);
  const [showAll, setShowAll] = useState(false);
  const name = (s: Side) => (lang === "de" ? s.de : s.en);

  const bar = (c: BalanceCheck) => {
    const [l, r] = sides[c.key];
    const weak = c.weaker === "left" ? l : c.weaker === "right" ? r : null;
    return (
      <div key={c.key} className="balance-pair">
        <RatioBar left={c.left} right={c.right} leftLabel={name(l)} rightLabel={name(r)} ok={!weak} ideal={c.ideal} />
        {weak && <p className="hint">{t(`Mehr ${weak.de}: ${weak.tipDe}`, `More ${weak.en.toLowerCase()}: ${weak.tipEn}`)}</p>}
      </div>
    );
  };

  const rest = checks.filter((c) => !c.weaker);
  return (
    <section className="card">
      <h2 className="card-title">{t("Balance (14 Tage)", "Balance (14 days)")}</h2>
      {checks.length === 0 ? (
        <p className="hint">{t("Noch zu wenig Training in den letzten 14 Tagen.", "Not enough training in the last 14 days yet.")}</p>
      ) : (
        <>
          {off.length === 0 ? (
            <p className="balance-ok">
              <Sticker name="ok" size={26} />
              {t("Alles im Gleichgewicht", "Everything in balance")}
            </p>
          ) : (
            off.map(bar)
          )}
          {rest.length > 0 && (
            <button className="link" onClick={() => setShowAll(!showAll)}>
              {showAll
                ? t("Ausgeglichene ausblenden", "Hide balanced pairs")
                : t(`${rest.length} ausgeglichene anzeigen`, `Show ${rest.length} balanced`)}
            </button>
          )}
          {showAll && rest.map(bar)}
        </>
      )}
    </section>
  );
};
