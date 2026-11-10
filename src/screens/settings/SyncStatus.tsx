import { useOwnerSyncStatus } from "../../db/schema";
import { useApp } from "../../ui/context";
import { syncState } from "../../ui/evoluDeps";
import { Sticker, type StickerName } from "../../ui/stickers";

export const SyncStatus = () => {
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
