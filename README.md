<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4c198204-5cde-4c74-83b0-bd346df67730

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Kartensets in der Desktop- und Mobile-App

In der Tauri-Desktop-App wird jedes Kartenset als `set.json` in einem eigenen Ordner unter `Sets/[Set-Name]/` gespeichert. Grafiken liegen separat in `Bilder/` im jeweiligen Set-Ordner. Diese Ordnerstruktur kann außerhalb von PandaMatch gesichert oder bearbeitet werden.

Auf Windows, macOS und Linux verwendet PandaMatch beim ersten Start den Installationsordner, sofern er beschreibbar ist. Andernfalls kann `Dokumente/PandaMatch/Sets` übernommen oder ein anderer Ordner gewählt werden.

Android und iOS unterstützen keine Ordnerauswahl über den nativen Dialog. Dort speichert PandaMatch Sets deshalb im privaten App-Datenordner unter `Sets/[Set-Name]/`; dafür werden keine allgemeinen Speicherberechtigungen angefordert. Für den Austausch mit anderen Apps können Sets einzeln oder gesammelt über den Systemdialog als portable JSON-Dateien exportiert und wieder importiert werden. Bilder sind in diesen Dateien eingebettet. Desktop-Exporte behalten die bearbeitbare Ordnerstruktur bei.

Set- und Bilderordner werden bei Bedarf automatisch angelegt. LaTeX-Formeln bleiben als Code im Set gespeichert; da PandaMatch sie direkt rendert und keine Formelbilder erzeugt, wird dafür kein `LaTeX/`-Ordner angelegt.
