import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { createBackup, downloadJson, hasContent, importBackup, parseBackup } from "../db/backup";
import { getRelayUrl, parseMnemonic, setRelayUrl, switchOwner } from "../db/owner";
import { useEvolu, useOwnerSyncStatus } from "../db/schema";
import { today } from "../domain/dates";
import { defaultRest, type Goal } from "../domain/model";
import { Icon, Segmented, Sheet } from "../ui/components";
import { useApp } from "../ui/context";
import { useFeedback } from "../ui/feedback";
import { syncState } from "../ui/evoluDeps";
import { goalShort } from "../ui/text";
import { Sticker, type StickerName } from "../ui/stickers";

// BarcodeDetector isn't in TypeScript's DOM lib yet.
interface DetectedBarcode {
  readonly rawValue: string;
}
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
declare const BarcodeDetector: (new (options: { formats: string[] }) => BarcodeDetectorInstance) | undefined;

const Scanner = ({ onResult }: { onResult: (text: string) => void }) => {
  const { t } = useApp();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (typeof BarcodeDetector === "undefined") {
      setError(t("Dein Browser kann keine QR-Codes scannen. Füge die Wörter unten ein.", "Your browser can’t scan QR codes. Paste the words below."));
      return;
    }
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (stopped || !video.current) return;
        video.current.srcObject = s;
        await video.current.play();
        const tick = async () => {
          if (stopped || !video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]) onResult(codes[0].rawValue);
          else timer = window.setTimeout(tick, 300);
        };
        void tick();
      })
      .catch(() => setError(t("Kein Kamerazugriff. Füge die Wörter unten ein.", "No camera access. Paste the words below.")));
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult, t]);
  return error ? <p className="hint">{error}</p> : <video ref={video} className="scanner" muted playsInline />;
};

const ShowCodeSheet = ({ onClose }: { onClose: () => void }) => {
  const { t } = useApp();
  const evolu = useEvolu();
  const mnemonic = evolu.appOwner.mnemonic;
  const [svg, setSvg] = useState("");
  const { toast } = useFeedback();
  useEffect(() => {
    void QRCode.toString(mnemonic, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg);
  }, [mnemonic]);
  return (
    <Sheet title={t("Dieses Gerät teilen", "Share this device")} onClose={onClose}>
      <p className="hint">
        {t(
          "Scanne den Code mit dem anderen Gerät (Einstellungen → Gerät verbinden). Der Code ist der Schlüssel zu all deinen Daten – zeig ihn niemandem sonst und bewahre die Wörter als Backup auf.",
          "Scan this code on the other device (Settings → Connect device). It is the key to all your data – don’t show it to anyone else, and keep the words as a backup.",
        )}
      </p>
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
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

const ConnectSheet = ({ onClose }: { onClose: () => void }) => {
  const { t, data } = useApp();
  const evolu = useEvolu();
  const [text, setText] = useState("");
  const [carry, setCarry] = useState(true);
  const [scanning, setScanning] = useState(true);
  const mnemonic = parseMnemonic(text);
  const isSelf = mnemonic === evolu.appOwner.mnemonic;
  const localData = hasContent(data);

  return (
    <Sheet title={t("Mit anderem Gerät verbinden", "Connect to another device")} onClose={onClose}>
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

const SyncStatus = () => {
  const { t } = useApp();
  const status = useOwnerSyncStatus(syncState);
  const label: Record<string, [StickerName, string, string]> = {
    Synced: ["ok", t("Synchronisiert", "Synced"), "ok"],
    Syncing: ["repeat", t("Synchronisiert …", "Syncing …"), "busy"],
    Disconnected: ["hourglass", t("Offline – Änderungen warten", "Offline – changes are queued"), "warn"],
    Error: ["warn", t("Sync-Fehler", "Sync error"), "error"],
    NoRelays: ["warn", t("Kein Sync", "No sync"), "warn"],
  };
  const [icon, text, cls] = label[status.type] ?? label.NoRelays!;
  return (
    <span className={`status-pill ${cls}`}>
      <Sticker name={icon} size={16} /> {text}
    </span>
  );
};

export const Settings = () => {
  const { t, data, actions, lang, open, exerciseName } = useApp();
  const { toast } = useFeedback();
  const [sheet, setSheet] = useState<"share" | "connect" | null>(null);
  const [relay, setRelay] = useState(getRelayUrl());
  const fileInput = useRef<HTMLInputElement>(null);
  const s = data.settings;
  const customExercises = [...data.exercises.values()].filter((e) => e.custom);
  const hasEgymTemplate = data.templates.some((x) => x.name === "EGYM-Zirkel");

  return (
    <div className="screen">
      <h1 className="page-title">{t("Einstellungen", "Settings")}</h1>

      <section className="card mint-card">
        <div className="section-row">
          <h2 className="card-title">{t("Geräte & Sync", "Devices & sync")}</h2>
          <SyncStatus />
        </div>
        <p className="hint">
          {t(
            "Kein Konto nötig. Deine Daten liegen auf deinen Geräten und werden Ende-zu-Ende-verschlüsselt über ein Relay abgeglichen.",
            "No account needed. Your data lives on your devices and syncs end-to-end encrypted via a relay.",
          )}
        </p>
        <div className="action-grid">
          <button className="button" onClick={() => setSheet("share")}>
            <Icon name="upload" /> {t("Dieses Gerät teilen", "Share this device")}
          </button>
          <button className="button dark" onClick={() => setSheet("connect")}>
            <Icon name="camera" /> {t("Gerät verbinden", "Connect device")}
          </button>
        </div>
        <details>
          <summary>{t("Eigenes Relay", "Custom relay")}</summary>
          <p className="hint">
            {t(
              "Standard ist das kostenlose Test-Relay von Evolu. Für dauerhaften Betrieb kannst du ein eigenes Evolu-Relay hosten und hier eintragen.",
              "The default is Evolu’s free test relay. For long-term use, host your own Evolu relay and enter it here.",
            )}
          </p>
          <div className="row gap">
            <input className="text-input grow" placeholder="wss://relay.example.com" value={relay} onChange={(e) => setRelay(e.target.value)} />
            <button className="button small" onClick={() => setRelayUrl(relay)}>
              {t("Speichern", "Save")}
            </button>
          </div>
        </details>
      </section>

      <section className="card">
        <h2 className="card-title">{t("Training", "Training")}</h2>
        <div className="field-label">{t("Ziel (bestimmt Wiederholungsbereich und Vorschläge)", "Goal (sets rep range and suggestions)")}</div>
        <Segmented<Goal>
          value={s.goal}
          onChange={(goal) => actions.updateSettings({ goal, restSeconds: defaultRest[goal] })}
          options={(["strength", "hypertrophy", "endurance"] as const).map((g) => ({ value: g, label: goalShort(g, lang) }))}
        />
        <div className="field-label">{t("Wochenziel (Trainingstage pro Woche)", "Weekly goal (training days per week)")}</div>
        <Segmented
          value={String(s.weeklyGoal)}
          onChange={(v) => actions.updateSettings({ weeklyGoal: Number(v) })}
          options={["1", "2", "3", "4", "5", "6", "7"].map((v) => ({ value: v, label: v }))}
        />
        <div className="field-label">{t("Kraft-Richtwerte", "Strength standards")}</div>
        <Segmented
          value={s.standards ?? ""}
          onChange={(v) => v && actions.updateSettings({ standards: v })}
          options={[
            { value: "male", label: t("Männer", "Men") },
            { value: "female", label: t("Frauen", "Women") },
          ]}
        />
        <div className="field-label">{t("Pausentimer", "Rest timer")}</div>
        <Segmented
          value={String(s.restSeconds)}
          onChange={(v) => actions.updateSettings({ restSeconds: Number(v) })}
          options={["0", "60", "90", "120", "180", "240"].map((v) => ({ value: v, label: v === "0" ? t("Aus", "Off") : `${Number(v) / 60 >= 1 && Number(v) % 60 === 0 ? `${Number(v) / 60} min` : `${v}s`}` }))}
        />
        <button className="button full" onClick={() => open({ type: "plates" })}>
          <Sticker name="plate" size={22} /> {t("Scheibenrechner", "Plate calculator")}
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">{t("Darstellung", "Display")}</h2>
        <div className="field-label">{t("Sprache", "Language")}</div>
        <Segmented value={lang} onChange={(language) => actions.updateSettings({ language })} options={[{ value: "de", label: "Deutsch" }, { value: "en", label: "English" }]} />
        <div className="field-label">{t("Einheit", "Unit")}</div>
        <Segmented
          value={s.unit}
          onChange={(unit) => actions.updateSettings({ unit, barWeight: unit === "kg" ? 20 : 20.41 })}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lbs" },
          ]}
        />
      </section>

      <section className="card">
        <h2 className="card-title">{t("Vorlagen / Splits", "Templates / splits")}</h2>
        <p className="hint">{t("Die Reihenfolge bestimmt den Split-Rhythmus („Als Nächstes dran“).", "The order defines your split rotation (“Up next”).")}</p>
        <div className="stack tight">
          {data.templates.map((tpl, i) => (
            <div key={tpl.id} className="template-row">
              <span className="grow">
                <strong>{tpl.name}</strong>
                <small> · {tpl.items.length} {t("Übungen", "exercises")}</small>
              </span>
              <button
                className="mini-button"
                disabled={i === 0}
                onClick={() => {
                  const ids = data.templates.map((x) => x.id);
                  [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
                  actions.reorderTemplates(ids);
                }}
                aria-label={t("Hoch", "Up")}
              >
                <Icon name="up" size={16} />
              </button>
              <button
                className="mini-button"
                onClick={() => {
                  const name = prompt(t("Neuer Name", "New name"), tpl.name);
                  if (name?.trim()) actions.renameTemplate(tpl.id, name);
                }}
                aria-label={t("Umbenennen", "Rename")}
              >
                <Icon name="pencil" size={16} />
              </button>
              <button className="mini-button ghost" onClick={() => confirm(t(`Vorlage „${tpl.name}“ löschen?`, `Delete template “${tpl.name}”?`)) && actions.deleteTemplate(tpl.id)} aria-label={t("Löschen", "Delete")}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
        {!hasEgymTemplate && (
          <button
            className="button full dashed"
            onClick={() => {
              actions.createEgymTemplate(data);
              toast(t("EGYM-Zirkel angelegt", "EGYM circuit created"));
            }}
          >
            <Icon name="plus" size={18} /> {t("EGYM-Zirkel als Vorlage anlegen", "Create EGYM circuit template")}
          </button>
        )}
      </section>

      {customExercises.length > 0 && (
        <section className="card">
          <h2 className="card-title">{t("Eigene Übungen", "Custom exercises")}</h2>
          <div className="stack tight">
            {customExercises.map((e) => (
              <div key={e.key} className="template-row">
                <span className="grow">{exerciseName(e)}</span>
                <button className="mini-button ghost" onClick={() => confirm(t("Übung löschen? Bisherige Einträge bleiben erhalten.", "Delete exercise? Logged sets are kept.")) && actions.deleteCustomExercise(e.key)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">{t("Backup", "Backup")}</h2>
        <p className="hint">{t("Zusätzliche Sicherung als lesbare JSON-Datei.", "Extra safety net as a readable JSON file.")}</p>
        <div className="action-grid">
          <button className="button" onClick={() => downloadJson(`repylo-backup-${today()}.json`, createBackup(data))}>
            <Icon name="download" /> {t("Exportieren", "Export")}
          </button>
          <button className="button" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" /> {t("Importieren", "Import")}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const backup = parseBackup(await file.text());
            if (!backup) return toast(t("Keine gültige Repylo-Sicherung", "Not a valid Repylo backup"));
            if (!confirm(t(`${backup.workouts.length} Trainings importieren? Sie werden zu den vorhandenen hinzugefügt.`, `Import ${backup.workouts.length} workouts? They’re added to the existing ones.`))) return;
            importBackup(backup, actions, data);
            toast(t("Import abgeschlossen", "Import complete"));
          }}
        />
      </section>

      <p className="hint center about">
        <strong>repylo</strong> · Every rep counts.
        <br />
        {t("Keine Accounts, kein Tracking. Deine Daten gehören dir.", "No accounts, no tracking. Your data is yours.")}
      </p>

      {sheet === "share" && <ShowCodeSheet onClose={() => setSheet(null)} />}
      {sheet === "connect" && <ConnectSheet onClose={() => setSheet(null)} />}
    </div>
  );
};
