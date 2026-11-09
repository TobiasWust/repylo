# repylo — Every rep counts.

Ein bunter, schneller Trainings-Tracker als PWA. **Kein Konto, kein Backend, kein Tracking.**
Die Daten liegen lokal auf deinen Geräten (SQLite im Browser) und werden
Ende-zu-Ende-verschlüsselt zwischen deinen Geräten synchronisiert ([Evolu](https://www.evolu.dev)).

## Funktionen

- **Training erfassen:** „Heute trainiert“ → Übungen (ca. 65 + 18 EGYM-Maschinen) oder eigene Übungen/Maschinen → Sätze mit Gewicht × Wdh., Zeit oder Strecke, Kommentar pro Übung und pro Training
- **Übernehmen:** beliebiges früheres Training oder eine Vorlage (Split) übernehmen, einzelne Übungen abwählbar
- **Vorlagen/Splits:** Training als Vorlage speichern; die Reihenfolge bestimmt den Split-Rhythmus. Fertiger **EGYM-Zirkel** (3 × 20) per Tipp
- **Progression (lokal, regelbasiert):** Double Progression je nach Ziel (Kraft 3–6, Aufbau 8–12, Ausdauer 15–20 Wdh.); mehr Gewicht erst, wenn alle Sätze oben im Bereich sind; Deload bei Leistungsabfall
- **Vorschlagskarten auf dem Startbildschirm** (wegwischbar, kommen 4 Tage nicht wieder):
  Split-Rhythmus · vernachlässigte Muskelgruppen · lange nicht gemacht · Erholung (48 h) · Drücken/Ziehen- und Quad/Beinbeuger-Balance · Plateau → Variante
- **Statistik pro Übung:** geschätztes 1RM, Max-Gewicht, Volumen, Wdh., Verlaufsdiagramm, Bestwerte pro Wiederholungszahl, Kraft relativ zum Körpergewicht
- **Gesamtstatistik:** Heatmap, Wochenserie, Volumen pro Woche, Sätze pro Muskelgruppe vs. Ziel, Balance, letzte Rekorde
- **Körpergewicht** mit geglättetem 7-Tage-Trend
- **Pausentimer** (Vibration + Ton), **Rekord-Feier** mit Konfetti, **Scheibenrechner**
- Deutsch/Englisch, kg/lbs, JSON-Export/-Import als Backup

## Geräte verbinden

Mehr → **Dieses Gerät teilen** zeigt einen QR-Code (24 Wörter). Auf dem zweiten Gerät
Mehr → **Gerät verbinden** und scannen (oder Wörter einfügen). Die Wörter sind der
Schlüssel zu allen Daten — gut aufbewahren, niemandem zeigen.

Synchronisiert wird über ein Relay, das nur verschlüsselte Daten sieht. Standard ist
Evolus kostenloses **Test-Relay** (kann Daten löschen; die Geräte behalten ihre Kopie).
Für den Dauerbetrieb oder wenn andere die App nutzen sollen: eigenes
[Evolu-Relay](https://www.evolu.dev/docs/relay) hosten und unter Mehr → Eigenes Relay eintragen.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server
npm test           # Unit-Tests der Logik (Progression, Vorschläge, Statistik)
npm run build      # Produktions-Build inkl. Service Worker
npm run preview    # Build lokal ausprobieren
```

Demo-Daten (6 Wochen Push/Pull/Beine): App mit `#demo` in der URL öffnen und neu laden.

Hinweis: Der eingebaute Browser der Claude-App kann keine Modul-SharedWorker mit Imports
laden; dort nur `npm run build && npm run preview` verwenden. Normale Browser sind nicht betroffen.

## Aufbau

```
src/
  domain/      reine Logik ohne UI: Übungen, Statistik, Progression, Vorschläge, Scheiben
  db/          Evolu-Schema, Schreibaktionen, Geräte-Schlüssel, Backup, Demo-Daten
  ui/          Kontext, gemeinsame Komponenten, Timer/Feier, Übungsauswahl
  screens/     Start, Training, Übungsstatistik, Verlauf, Statistik, Körper, Einstellungen
```

Alle Daten werden einmal geladen und als reine Funktionen ausgewertet — Trainingslogs
sind klein, und so ist die Logik einfach testbar (`src/domain/domain.test.ts`).
