# PandaMatch 🐼

Lernen muss sich nicht nach Pauken anfühlen! **PandaMatch** macht aus Begriffen, Formeln, Bildern und anderen Fakten ein interaktives Lernerlebnis. Du bringst Inhalte in eigenen Kartensets unter und übst sie so, wie es gerade am besten passt – spielerisch, gezielt oder ganz entspannt.

## Das kannst du mit PandaMatch machen

- **Klassisches Memory spielen:** Im Original-Modus suchst du passende Kartenpaare. Der erweiterte Modus verbindet mehrere Eigenschaften eines Konzepts und hilft dir mit farbkodierten Karten.
- **Offen lernen:** Alle Karten liegen aufgedeckt vor dir. So kannst du Zusammenhänge in Ruhe erkennen und passende Begriffe, Formeln oder Bilder zuordnen.
- **Dich selbst abfragen:** Beim Active Recall rufst du weitere Eigenschaften eines Konzepts aus dem Gedächtnis ab und schätzt ein, wie sicher du dir bist. Unsichere Inhalte kommen beim Üben bevorzugt wieder.
- **Wissen zeichnen:** Im Zeichenmodus skizzierst du mit Maus oder Touch – zum Beispiel eine Strukturformel – und vergleichst deine Zeichnung anschließend mit der Lösung.
- **Eigene Sets gestalten:** Lege Kartensets mit beliebig benannten Eigenschaften und ergänzenden Informationen an. Formeln, chemische Strukturen und Bilder werden unterstützt; für LaTeX und chemische Notation gibt es einen Editor mit Vorlagen und Live-Vorschau.
- **Deinen Lernstand im Blick behalten:** Statistiken zeigen, was schon sitzt und was noch Übung braucht. In der Bestenliste kannst du deine Spielergebnisse ansehen.
- **Flexibel spielen:** Wähle einzelne oder mehrere Sets, lass Karten aus allen Sets mischen und passe den Umfang der Runde an. Den klassischen Modus kannst du allein oder zu zweit spielen.

## So legst du los

Lade den Installer für dein Gerät aus den [offiziellen Releases](https://github.com/panda-test-lab/PandaMatch/releases) herunter und installiere PandaMatch. Eine lokale npm-Installation ist für die normale Nutzung nicht erforderlich. Wähle anschließend im Hauptmenü einen Spiel- oder Lernmodus. Vor einer Runde kannst du das Kartenset und weitere Einstellungen festlegen. Wenn du eigene Inhalte nutzen möchtest, findest du unter **Kartensets** die Verwaltung zum Erstellen und Bearbeiten.

## Kartensets erstellen und teilen

Unter **Kartensets** kannst du Sets anlegen, bearbeiten, suchen und löschen. Jedes Set lässt sich einzeln als eigenständige JSON-Datei mit allen Eigenschaften exportieren. Du kannst einzelne Sets oder mehrere Sets importieren und exportieren; JSON-Code lässt sich auch direkt einfügen. Beim portablen Export sind die Bilder im Set enthalten. So kannst du Sets sichern oder mit anderen teilen.

Zusätzlich entsteht ein eigenes Repository namens **PandaFlow_Sets**, in dem ich selbst erstellte Kartensets anbieten werde. Das Repository ist noch in Arbeit und wird hier verlinkt, sobald es verfügbar ist.

In der Tauri-Desktop-App wird jedes Set als `set.json` in einem eigenen Ordner unter `Sets/[Set-Name]/` gespeichert. Bilder liegen separat im Ordner `Bilder/` des jeweiligen Sets. Diese Ordnerstruktur lässt sich außerhalb von PandaMatch sichern oder bearbeiten.

Auf Windows, macOS und Linux nutzt PandaMatch beim ersten Start den Installationsordner, sofern er beschreibbar ist. Andernfalls kann `Dokumente/PandaMatch/Sets` übernommen oder ein anderer Ordner gewählt werden.

Auf Android und iOS speichert PandaMatch Sets im privaten App-Datenordner unter `Sets/[Set-Name]/`, da mobile Geräte die Ordnerauswahl über einen nativen Dialog nicht unterstützen. Dafür sind keine allgemeinen Speicherberechtigungen nötig. Sets können über den Systemdialog als portable JSON-Dateien importiert und exportiert werden; Bilder sind darin eingebettet. Desktop-Exporte behalten die bearbeitbare Ordnerstruktur bei.

Set- und Bilderordner werden bei Bedarf automatisch angelegt. LaTeX-Formeln bleiben als Code im Set gespeichert und werden direkt gerendert – dafür werden keine Formelbilder oder zusätzlichen `LaTeX/`-Ordner erstellt.


## Hinweise zur Installation unter Android und macOS

Beim ersten Start kann Android oder macOS eine Sicherheitswarnung anzeigen. PandaMatch wird außerhalb der offiziellen Stores verteilt; deshalb kann das System die Herkunft der App nicht wie bei einer Store-App bestätigen. Eine solche Warnung allein bedeutet nicht, dass PandaMatch defekt oder beschädigt ist. Lade die App nur aus den offiziellen [PandaMatch-Releases](https://github.com/panda-test-lab/PandaMatch/releases) herunter und nimm Sicherheitsmeldungen ernst.

### Android

Android kann beim Installieren eine Bestätigung verlangen, weil die App außerhalb des Play Stores bezogen wurde. Öffne in diesem Fall die Android-Einstellungen für **Unbekannte Apps installieren** und erlaube die Installation vorübergehend für genau die App, mit der du den Installer geöffnet hast – zum Beispiel deinen Browser oder Dateimanager. Kehre danach zum Installer zurück und bestätige die Installation. Die Bezeichnungen der Menüs unterscheiden sich je nach Android-Version und Gerätehersteller.

Deaktiviere Google Play Protect nicht pauschal. Wenn Play Protect ausdrücklich vor Schadsoftware warnt oder die Installation blockiert, brich ab und prüfe, ob du wirklich den Installer aus den offiziellen Releases geladen hast.

### macOS

macOS kann den Start einer App blockieren, deren Entwickler nicht verifiziert oder die nicht notariell beglaubigt wurde. Wenn du PandaMatch aus den offiziellen Releases geladen hast, kannst du die App im Finder bei gedrückter **Ctrl-Taste** anklicken und **Öffnen** wählen. Bestätige anschließend den Start im Dialog.

Falls macOS den Start weiterhin verhindert, öffne direkt danach **Systemeinstellungen → Datenschutz & Sicherheit**. Im Abschnitt **Sicherheit** kann die Option **Dennoch öffnen** erscheinen. Wähle sie nur für PandaMatch und bestätige die Nachfrage. Deaktiviere Gatekeeper oder andere macOS-Schutzfunktionen nicht global. Meldet macOS ausdrücklich, die App sei beschädigt oder enthalte Schadsoftware, erzwinge den Start nicht: Lade den Installer erneut aus den offiziellen Releases herunter und prüfe, ob die Warnung weiterhin erscheint.
