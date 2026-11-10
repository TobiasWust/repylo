import { useState } from "react";
import { Sheet } from "./components";

const Email = () => <a href="mailto:kontakt@tobiaswust.de">kontakt@tobiaswust.de</a>;

export const PrivacyPolicySheet = ({ onClose }: { onClose: () => void }) => (
  <Sheet title="Privacy Policy" onClose={onClose}>
    <div className="legal">
      <p className="legal-meta">repylo · Last updated: November 2026</p>

      <section>
        <h3>1. Controller</h3>
        <p>
          The controller responsible for data processing on this website within the meaning of the General Data Protection Regulation (GDPR)
          is:
        </p>
        <p>
          Tobias Wust
          <br />
          Email: <Email />
        </p>
      </section>

      <section>
        <h3>2. Overview</h3>
        <p>
          repylo is a <strong>local-first</strong> workout tracker. Everything you enter – workouts, sets, exercises, templates, body
          weight, settings – is stored in an encrypted database in your browser, on your own device. We never see it.
        </p>
        <p>There are no accounts, no cookies, no advertising and no tracking. The only external services involved are:</p>
        <ul>
          <li>
            <strong>Netlify</strong> – hosts and serves the app files (Section 6).
          </li>
          <li>
            <strong>Evolu sync relay</strong> – passes end-to-end encrypted data between your devices (Section 4).
          </li>
          <li>
            <strong>GoatCounter</strong> – counts app opens anonymously, without cookies (Section 5).
          </li>
        </ul>
      </section>

      <section>
        <h3>3. Data stored on your device</h3>
        <p>
          Your training data and a randomly generated device identity (a 24-word phrase) are stored in your browser's storage (SQLite via
          OPFS, and local storage for small app settings). This data:
        </p>
        <ul>
          <li>is encrypted with a key derived from your device identity and is not accessible to us;</li>
          <li>can be exported by you at any time as JSON in the app's settings;</li>
          <li>can be deleted at any time by clearing your browser's site data for this app.</li>
        </ul>
        <p>
          This storage is technically necessary to provide the app you are actively using (Art. 6(1)(b) GDPR, § 25(2) TDDDG) and involves no
          tracking or profiling.
        </p>
        <p>
          The camera is only used when you scan a pairing QR code. The image is processed on your device and is never recorded or
          transmitted.
        </p>
      </section>

      <section>
        <h3>4. Sync between devices (Evolu relay)</h3>
        <p>
          To keep your devices in sync, repylo sends changes to a sync relay operated by Evolu (evoluhq.com). Before anything leaves your
          device, it is <strong>end-to-end encrypted</strong> with a key that only your devices know. The relay stores and forwards this
          ciphertext; it cannot read your workouts.
        </p>
        <ul>
          <li>No name, email address or password is collected.</li>
          <li>
            The relay technically processes your IP address and an anonymous identifier of your encrypted data, as is necessary for any
            network connection.
          </li>
          <li>
            Pairing a new device happens via a QR code or link that carries your device identity in the URL fragment, which is never sent to
            any server.
          </li>
        </ul>
        <p>
          <strong>Legal basis:</strong> Art. 6(1)(b) GDPR – processing necessary to provide the sync function of the app.
        </p>
      </section>

      <section>
        <h3>5. Anonymous visit counter (GoatCounter)</h3>
        <p>
          To know roughly how many people use repylo, app opens are counted with GoatCounter (goatcounter.com). It sets no cookies and
          stores no personal data: it records the page, referrer, browser, screen size and country, derived from the request. The IP address
          is not stored. Workout data is never sent.
        </p>
        <p>
          <strong>Legal basis:</strong> Art. 6(1)(f) GDPR – our legitimate interest in understanding, in aggregate, how much the app is
          used.
        </p>
      </section>

      <section>
        <h3>6. Hosting and server logs (Netlify)</h3>
        <p>
          This website is hosted by <strong>Netlify, Inc.</strong> When you open the app, Netlify automatically processes technical data
          needed to deliver it, such as IP address, browser type and version, date and time of the request, the file requested and the
          amount of data transferred. We do not use this data for tracking or analytics.
        </p>
        <p>
          <strong>Legal basis:</strong> Art. 6(1)(f) GDPR – our legitimate interest in a secure and functional website.
        </p>
        <p>
          Netlify acts as our processor under a data processing agreement. Where data is processed outside the EU/EEA, this is safeguarded
          by Standard Contractual Clauses.
        </p>
      </section>

      <section>
        <h3>7. Storage duration</h3>
        <ul>
          <li>Data on your device stays there until you delete it or clear your browser's site data.</li>
          <li>Encrypted sync data stays on the relay as long as the relay operator keeps it.</li>
          <li>Server logs are kept by Netlify only as long as technically necessary.</li>
        </ul>
      </section>

      <section>
        <h3>8. Your rights</h3>
        <p>Under the GDPR you have the right to:</p>
        <ul>
          <li>access your personal data (Art. 15)</li>
          <li>rectification (Art. 16)</li>
          <li>erasure (Art. 17)</li>
          <li>restriction of processing (Art. 18)</li>
          <li>data portability (Art. 20) – you can export your data yourself at any time</li>
          <li>object to processing based on legitimate interest (Art. 21)</li>
        </ul>
        <p>
          To exercise these rights, contact us at <Email />. You also have the right to lodge a complaint with a data protection supervisory
          authority.
        </p>
      </section>

      <section>
        <h3>9. Changes</h3>
        <p>We may update this policy when the app or legal requirements change. The current version always applies.</p>
      </section>
    </div>
  </Sheet>
);

export const ImprintSheet = ({ onClose }: { onClose: () => void }) => (
  <Sheet title="Imprint" onClose={onClose}>
    <div className="legal">
      <p className="legal-meta">Legal notice pursuant to § 5 DDG (Germany)</p>

      <section>
        <h3>Contact</h3>
        <p>
          Tobias Wust
          <br />
          Vor den Kämpen 20
          <br />
          30851 Langenhagen
          <br />
          Germany
        </p>
        <p>
          Email: <Email />
        </p>
      </section>

      <section>
        <h3>Responsible for content</h3>
        <p>Tobias Wust (address as above)</p>
      </section>

      <section>
        <h3>About this project</h3>
        <p>
          repylo is a private, non-commercial project. See the <strong>Privacy Policy</strong> for how data is handled.
        </p>
      </section>
    </div>
  </Sheet>
);

/** "Made with ❤️ by Wust" plus links to the privacy policy and imprint. */
export const LegalFooter = () => {
  const [open, setOpen] = useState<"privacy" | "imprint" | null>(null);
  return (
    <>
      <footer className="app-footer">
        <p>
          Made with ❤️ by{" "}
          <a href="https://wust.dev/" target="_blank" rel="noopener noreferrer">
            Wust
          </a>
        </p>
        <p className="app-footer-legal">
          <button type="button" className="footer-link" onClick={() => setOpen("privacy")}>
            Privacy Policy
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" className="footer-link" onClick={() => setOpen("imprint")}>
            Imprint
          </button>
        </p>
      </footer>
      {open === "privacy" && <PrivacyPolicySheet onClose={() => setOpen(null)} />}
      {open === "imprint" && <ImprintSheet onClose={() => setOpen(null)} />}
    </>
  );
};
