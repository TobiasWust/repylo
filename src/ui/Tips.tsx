import { tipsFor } from "../domain/tips";
import { useApp } from "./context";
import { Sticker } from "./stickers";

/** Technique cues for an exercise; renders nothing if there are none. */
export const TipsList = ({ exerciseKey, card = false }: { exerciseKey: string; card?: boolean }) => {
  const { t, lang } = useApp();
  const tips = tipsFor(exerciseKey, lang);
  if (!tips) return null;
  const list = (
    <ul className="tips">
      {tips.map((tip) => (
        <li key={tip}>{tip}</li>
      ))}
    </ul>
  );
  if (!card) return <div className="tips-box">{list}</div>;
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="bulb" /> {t("Technik-Tipps", "Technique tips")}
      </h2>
      {list}
    </section>
  );
};
