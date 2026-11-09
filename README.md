# SMO Stundenplan Card

Lovelace-Karte für Home Assistant, die den Stundenplan aus der
[Schulmanager-Online-Integration](https://github.com/MrIcemanLE/Schulmanager-homeassistant) (SMO) darstellt –
mit farbig hervorgehobenen Änderungen. Die Karte ist eine eigenständige Frontend-Erweiterung und verändert die
Integration nicht.

- **Drei Ansichten:** Kompakt (Morgenübersicht), Tag, Woche – direkt in der Karte umschaltbar
- **Änderungen auf einen Blick:** Entfall (rot), Raumwechsel (orange), Lehrerwechsel/Vertretung (gelb),
  Fachwechsel/sonstige Änderung (violett), Prüfung (blau) – inklusive „vorher → nachher“, z. B. `B08 → B12` oder `Weber → Schmitt`
- **Mehrere Änderungen pro Stunde** werden gleichzeitig gezeigt (mehrere Badges, mehrfarbiger Rand)
- **Dark & Light Mode** (folgt dem Home-Assistant-Theme), responsiv von Smartphone bis Wanddisplay
- **Visueller Editor** mit Schüler-Dropdown (aus den vorhandenen SMO-Sensoren), Standardansicht, sichtbaren Ansichten und Anzeigeoptionen
- Deutsch und Englisch

## Voraussetzungen

- Aktuelles Home Assistant (getestet mit 2026.11)
- Schulmanager-Integration **ab v0.13.0** (stellt `schulmanager.get_schedule` bereit). Nach einem Update der Integration
  Home Assistant **neu starten**, sonst fehlt die Aktion trotz neuer Dateien.

## Installation

### HACS (empfohlen)

1. HACS → ⋮ → *Benutzerdefinierte Repositories* → Repository-URL dieses Projekts, Kategorie **Dashboard**.
2. „SMO Stundenplan Card“ installieren, Browser-Cache leeren.
3. HACS legt die Ressource automatisch an (`/hacsfiles/smo-schedule-card/smo-schedule-card.js`).

### Manuell

1. `dist/smo-schedule-card.js` nach `<config>/www/smo-schedule-card/` kopieren.
2. Einstellungen → Dashboards → ⋮ → *Ressourcen* → `/local/smo-schedule-card/smo-schedule-card.js` als **JavaScript-Modul** hinzufügen.

## Konfiguration

Im Dashboard-Editor *Karte hinzufügen → „SMO Stundenplan“*. Der Schüler wird per Dropdown gewählt; die Liste wird aus den
vorhandenen Schulmanager-Geräten/-Sensoren gebildet. Es gibt keine fest einprogrammierten Entity-IDs.

```yaml
type: custom:smo-schedule-card
entity: sensor.schule_max_mustermann_stundenplan_heute   # beliebige SMO-Entität des Schülers
default_view: week
```

| Option | Standard | Beschreibung |
|---|---|---|
| `entity` | – | Eine beliebige Schulmanager-Entität des Schülers (der Editor wählt den Sensor „Stundenplan heute“). Alternativ `student_id`. |
| `student_id` | – | Schulmanager-ID des Schülers, wenn keine Entität angegeben wird. |
| `title` | `Stundenplan · <Name>` | Eigener Titel |
| `default_view` | `week` | `compact`, `day` oder `week` |
| `views` | alle drei | Sichtbare Ansichten (die Umschaltung entfällt bei nur einer) |
| `language` | `auto` | `auto`, `de`, `en` |
| `show_teacher` / `show_room` / `show_times` | `true` | Lehrkräfte, Räume, Uhrzeiten |
| `show_cancelled` | `true` | Entfallene Stunden sichtbar lassen (durchgestrichen) |
| `show_legend` / `show_summary` / `show_status` / `show_date` | `true` | Legende, Wochenzusammenfassung, Datenstand/Fehler, Datum |
| `expandable` | `true` | Antippen einer Stunde klappt Details auf |
| `weekend_shows_next_week` | `true` | Am Wochenende die kommende Woche zeigen |
| `show_weekend_lessons` | `true` | Samstag/Sonntag nur zeigen, wenn Stunden vorhanden sind |

Beispiele liegen in [`examples/`](examples).

## Ansichten

- **Woche:** Raster Montag–Freitag, Stunden zeilenweise ausgerichtet (Freistunden bleiben leer, parallele Kurse stehen
  untereinander, Nachmittagsunterricht erscheint automatisch). Der Tageskopf zeigt Änderungen; Antippen eines Tages öffnet die Tagesansicht.
  Auf schmalen Displays wird das Raster zu einer Tagesliste.
- **Tag:** Beginn, Ende, Stundenzahl, alle Stunden mit Uhrzeit, Fach, Lehrkraft und Raum, aktuelle Stunde, Datenstand.
  Die Pfeile überspringen Wochenenden.
- **Kompakt:** Zeigt heute – oder den nächsten Schultag, sobald der Unterricht vorbei ist oder schulfrei ist. Beginn, Ende,
  aktuelle bzw. nächste Stunde und nur die auffälligen Änderungen.

Der aktuelle Tag und die laufende Stunde sind hervorgehoben. Schulfreie Tage, Wochenenden und Tage außerhalb des abgerufenen
Zeitraums werden jeweils eigens gekennzeichnet; es werden nie Stunden erfunden.

## Datenquellen

| Quelle | Verwendung |
|---|---|
| Aktion `schulmanager.get_schedule` | Hauptquelle: strukturierter Stundenplan (Tage, Stunden, Zeiten, `original`, `changes`, `status`, `fetched_at`) |
| Ereignis `schulmanager_schedule_updated` | Karte lädt sofort neu, sobald die Integration neue Daten hat |
| `sensor.<schüler>_stundenplan_heute` / `_morgen` | Schüler-Erkennung (`raw.student_id`); Fallback-Daten, wenn die Aktion fehlt |
| `sensor.<schüler>_tage_bis_nachste_arbeit` | Prüfungen (`upcoming_exams`, strukturiert) |
| `sensor.<schüler>_stundenplan_anderungen`, `_wochenplan_json` | werden **nicht** ausgewertet (enthalten nur Text/Emoji bzw. sind redundant) |

Änderungen stammen ausschließlich aus strukturierten Feldern, nie aus Emojis oder HTML.

### Wie Änderungen erkannt werden

| Farbe | Auslöser in `get_schedule` |
|---|---|
| Rot – Entfall | `status: cancelled` / `changes` enthält `cancellation` (geplante Stunde bleibt sichtbar) |
| Orange – Raumwechsel | `changes` enthält `room`; geplanter Raum aus `original.rooms` |
| Gelb – Lehrerwechsel | `changes` enthält `teacher`; geplante Lehrkraft aus `original.teachers` |
| Violett – Fachwechsel / sonstiges | `changes` enthält `subject` bzw. `special`, oder `status: changed` ohne erkennbaren Unterschied (Hinweistext) |
| Blau – Prüfung | Eintrag in `upcoming_exams` mit gleichem Datum und Fach (Kürzel oder Name) |

Hinweise:

- Die Prüfungsdaten haben keine Stundenangabe. Alle Stunden des Fachs an diesem Tag werden markiert. Prüfungen ohne passende
  Stunde erscheinen als eigener Eintrag „Prüfung ohne zugeordnete Stunde“.
- Der Sensor liefert höchstens die nächsten 5 Prüfungen; weiter entfernte Arbeiten zeigt die Karte erst, wenn sie nachrücken.

### Eingeschränkter Modus

Fehlt `schulmanager.get_schedule` (ältere Integration oder nach dem Update nicht neu gestartet), zeigt die Karte einen
Hinweis und nur **heute und morgen** aus den Sensoren. Die Woche bleibt dann leer, weil der Wochensensor nur Emoji-Text enthält.

## Datenstand und Fehler

Die Fußzeile zeigt „Stand: vor 10 Min.“. Ist der letzte Abruf der Integration fehlgeschlagen (`status: stale`), erscheint
ein Warnhinweis mit dem Zeitpunkt der letzten guten Daten; ohne Daten (`unavailable`) bzw. bei Ladefehlern eine Fehlermeldung mit „Neu laden“.

## Entwicklung

```bash
npm install
npm test            # Vitest (jsdom): Datenmodell, alle Änderungstypen, Ansichten, Editor
npm run typecheck
npm run build       # erzeugt dist/smo-schedule-card.js
node scripts/deploy.mjs <config>/www/smo-schedule-card   # auf eine Test-Instanz kopieren
```

`dev/index.html` (nach `npx esbuild dev/harness.ts --bundle --format=esm --outfile=dev/harness.js`) rendert die Karte mit
synthetischen Daten und eingefrorener Uhr (`?view=week|day|compact&theme=light&w=480`). Die Testdaten in
`tests/fixtures/sample.ts` haben exakt das Format von `get_schedule` (`schema_version: 1`).

Projektstruktur:

```
src/
  model.ts     Normalisierung, Änderungserkennung, Abfragen (Tag/Woche/aktuelle Stunde)
  data.ts      get_schedule, Prüfungen, Fallback über Sensoren, Ereignis-Abo
  hass.ts      Schüler-Erkennung über die Entity-Registry (platform schulmanager)
  render.ts    HTML-Rendering der drei Ansichten
  styles.ts    Theme-Variablen (dark/light), responsive Container-Queries
  card.ts      Custom Element (Zustand, Navigation, Aktualisierung)
  editor.ts    visueller Editor (ha-form)
tests/         Vitest-Tests und Fixtures
```

## Lizenz

MIT
