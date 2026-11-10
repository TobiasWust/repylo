import { useEffect, useRef, useState } from "react";
import { useApp } from "../../ui/context";

// BarcodeDetector isn't in TypeScript's DOM lib yet.
interface DetectedBarcode {
  readonly rawValue: string;
}
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
declare const BarcodeDetector: (new (options: { formats: string[] }) => BarcodeDetectorInstance) | undefined;

export const Scanner = ({ onResult }: { onResult: (text: string) => void }) => {
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
