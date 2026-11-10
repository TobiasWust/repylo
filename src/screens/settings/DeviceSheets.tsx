import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createBackup, hasContent } from "../../db/backup";
import { connectLink, parseMnemonic, switchOwner } from "../../db/owner";
import { useEvolu } from "../../db/schema";
import { Icon, Sheet } from "../../ui/components";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { Sticker } from "../../ui/stickers";
import { Scanner } from "./Scanner";

export const ShowCodeSheet = ({ onClose }: { onClose: () => void }) => {
  const { t } = useApp();
  const evolu = useEvolu();
  const mnemonic = evolu.appOwner.mnemonic;
  const link = connectLink(mnemonic);
  const [svg, setSvg] = useState("");
  const { toast } = useFeedback();
  useEffect(() => {
    void QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg);
  }, [link]);
  return (
    <Sheet title={t("Dieses Gerät teilen", "Share this device")} onClose={onClose}>
      <p className="hint">
        {t(
          "Scanne den Code einfach mit der Kamera des anderen Geräts – der Link öffnet repylo und verbindet es. Der Code ist der Schlüssel zu all deinen Daten: zeig ihn niemandem sonst.",
          "Just scan this code with the other device’s camera – the link opens repylo and connects it. The code is the key to all your data: don’t show it to anyone else.",
        )}
      </p>
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <button
        className="button full"
        onClick={() => {
          void navigator.clipboard.writeText(link);
          toast(t("Link kopiert – nur an dich selbst schicken!", "Link copied – only send it to yourself!"));
        }}
      >
        <Icon name="copy" size={18} /> {t("Link kopieren", "Copy link")}
      </button>
      <p className="hint">
        {t(
          "iPhone: Der Link öffnet Safari. Verbinde dort und füge repylo danach über „Teilen → Zum Home-Bildschirm“ hinzu – die Home-Bildschirm-App hat auf dem iPhone einen eigenen Speicher.",
          "iPhone: the link opens Safari. Connect there, then add repylo via “Share → Add to Home Screen” – the home screen app has its own storage on iPhone.",
        )}
      </p>
      <details className="words">
        <summary>{t("Wörter anzeigen", "Show words")}</summary>
        <ol>
          {mnemonic.split(" ").map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ol>
        <button
          className="button small"
          onClick={() => {
            void navigator.clipboard.writeText(mnemonic);
            toast(t("Kopiert", "Copied"));
          }}
        >
          <Icon name="copy" size={16} /> {t("Kopieren", "Copy")}
        </button>
      </details>
    </Sheet>
  );
};

export const ConnectSheet = ({ onClose, initialText = "" }: { onClose: () => void; initialText?: string }) => {
  const { t, data } = useApp();
  const evolu = useEvolu();
  const [text, setText] = useState(initialText);
  const [carry, setCarry] = useState(true);
  const [scanning, setScanning] = useState(!initialText);
  const fromLink = !!initialText && !!parseMnemonic(initialText);
  const mnemonic = parseMnemonic(text);
  const isSelf = mnemonic === evolu.appOwner.mnemonic;
  const localData = hasContent(data);

  return (
    <Sheet title={t("Mit anderem Gerät verbinden", "Connect to another device")} onClose={onClose}>
      {fromLink ? (
        <p className="with-sticker">
          <Sticker name="ok" size={28} />
          {t("Link erkannt. Verbinde dieses Gerät, um deine repylo-Daten hier zu sehen.", "Link recognised. Connect this device to see your repylo data here.")}
        </p>
      ) : (
        <>
          <p className="hint">
            {t("Öffne auf dem anderen Gerät Einstellungen → „Dieses Gerät teilen“ und scanne den Code.", "On the other device, open Settings → “Share this device” and scan the code.")}
          </p>
          {scanning && !mnemonic && (
            <Scanner
              onResult={(value) => {
                setText(value);
                setScanning(false);
              }}
            />
          )}
          <textarea className="text-input" rows={3} placeholder={t("… oder die 24 Wörter einfügen", "… or paste the 24 words")} value={text} onChange={(e) => setText(e.target.value)} />
        </>
      )}
      {text && !mnemonic && <p className="hint warn">{t("Das ist kein gültiger Code.", "That’s not a valid code.")}</p>}
      {isSelf && <p className="hint">{t("Das ist bereits dieses Gerät.", "That’s already this device.")}</p>}
      {mnemonic && !isSelf && (
        <>
          {localData && (
            <label className="check-line">
              <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
              <span>{t("Trainings dieses Geräts mitnehmen (sonst sind sie danach ausgeblendet)", "Bring this device’s workouts along (otherwise they’re hidden afterwards)")}</span>
            </label>
          )}
          <button className="button dark full" onClick={() => switchOwner(mnemonic, localData && carry ? JSON.stringify(createBackup(data)) : null)}>
            <Icon name="sync" /> {t("Verbinden", "Connect")}
          </button>
        </>
      )}
    </Sheet>
  );
};
