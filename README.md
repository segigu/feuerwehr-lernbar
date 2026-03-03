# MTA Prüfungstrainer

Telegram Mini App zur Vorbereitung auf die **Zwischenprüfung des Basismoduls** (MTA) der Freiwilligen Feuerwehr in Bayern.

**[Bot starten: @feuerwehr_lernbar_bot](https://t.me/feuerwehr_lernbar_bot)**

## Funktionen

- **214 Prüfungsfragen** aus dem offiziellen Fragenkatalog (Basis 15.2, Staatliche Feuerwehrschule Würzburg)
- **12 Themengebiete** vollständig abgedeckt
- **3 Lernmodi:**
  - **Alle Fragen** — alle 214 Fragen der Reihe nach, mit sofortiger Auswertung
  - **Prüfung** — 50 zufällige Fragen, optionaler Timer (45 Min.), Ergebnis erst am Ende
  - **Nach Thema** — gezielt ein Themengebiet üben, mit sofortiger Auswertung
- **Bestehensgrenze 50%** im Prüfungsmodus (25 von 50 Fragen)
- **Antworten-Review** nach Abschluss mit Filtermöglichkeit (Alle / Richtig / Falsch)
- **Dark Mode** — passt sich automatisch an die Telegram-Einstellungen an

## Themengebiete

| Thema | Fragen |
|-------|--------|
| Rechtsgrundlagen und Organisation | — |
| Brennen und Löschen | — |
| Fahrzeugkunde | — |
| Persönliche Ausrüstung und Löschgeräte | — |
| Geräte und Armaturen | — |
| Rettung, Leitern und Knoten | — |
| Erste Hilfe und Einsatzhygiene | — |
| Einsatzgrundsätze und Gefahren | — |
| Löscheinsatz (FwDV 3) | — |
| Sichern und Absturzsicherung | — |
| Technische Hilfeleistung und Gefahrgut | — |
| Sprechfunk | — |

## Technologie

| Komponente | Technologie | Beschreibung |
|------------|-------------|--------------|
| Frontend | Vanilla TypeScript + Vite | Minimaler Bundle (<50 KB), schnelle Ladezeit |
| Stile | Reines CSS mit Custom Properties | Kein Framework, Telegram-Theme-Anpassung |
| Bot | grammY (TypeScript) | Telegram-Bot-Framework |
| Daten | JSON im Bundle | Kein Backend nötig, alles client-seitig |
| Hosting | GitHub Pages | Automatisches Deployment via GitHub Actions |

## Projektstruktur

```
MTA/
├── webapp/                          # Frontend (Telegram Mini App)
│   ├── src/
│   │   ├── main.ts                  # Initialisierung, Telegram SDK
│   │   ├── app.ts                   # Screen-Router (State Machine)
│   │   ├── screens/
│   │   │   ├── home.ts              # Startseite mit 3 Modi
│   │   │   ├── topic-select.ts      # Themenauswahl
│   │   │   ├── quiz.ts              # Quiz-Bildschirm
│   │   │   ├── results.ts           # Ergebnisanzeige
│   │   │   └── review.ts            # Antworten-Überprüfung
│   │   ├── components/
│   │   │   ├── question-card.ts     # Fragenkarte mit Antwortoptionen
│   │   │   └── progress-bar.ts      # Fortschrittsbalken
│   │   ├── state/
│   │   │   └── quiz-state.ts        # Session-Verwaltung
│   │   ├── data/
│   │   │   └── questions.ts         # Datenimport, Shuffle, Filter
│   │   ├── utils/
│   │   │   ├── telegram.ts          # Telegram WebApp API Wrapper
│   │   │   └── dom.ts               # DOM-Hilfsfunktionen
│   │   └── styles/
│   │       ├── variables.css        # Design-Tokens, Dark Mode
│   │       ├── global.css           # Basis-Stile, Typografie
│   │       └── components.css       # Komponentenstile
│   ├── public/images/               # Gefahrzeichen (5 PNG)
│   ├── index.html
│   └── vite.config.ts
├── bot/                             # Telegram-Bot
│   ├── src/
│   │   └── bot.ts                   # /start-Kommando, öffnet Mini App
│   └── .env                         # BOT_TOKEN, WEB_APP_URL
└── mta_fragenkatalog.json           # Quelldaten (214 Fragen)
```

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- npm

### Webapp starten

```bash
cd webapp
npm install
npm run dev
```

Die App öffnet sich unter `http://localhost:5173`. Alle Funktionen sind auch ohne Telegram testbar.

### Bot starten

1. `.env`-Datei im `bot/`-Verzeichnis erstellen:

```env
BOT_TOKEN=dein_bot_token
WEB_APP_URL=https://segigu.github.io/feuerwehr-lernbar/
```

2. Bot starten:

```bash
cd bot
npm install
npm start
```

## Deployment

### Webapp (GitHub Pages)

Das Deployment erfolgt automatisch bei jedem Push auf den `master`-Branch über GitHub Actions.

Workflow: `.github/workflows/deploy.yml`

### Bot

Der Bot läuft im Long-Polling-Modus und benötigt keinen Webserver. Er kann auf einem beliebigen Server gestartet werden:

```bash
cd bot
npm install
npm start
```

## Quellenangabe und Hinweise

### Datenquelle

Die Prüfungsfragen stammen aus dem **Fragenkatalog der Staatlichen Feuerwehrschule Würzburg** (Version Basis 15.2, 04/2015). Der Fragenkatalog ist öffentlich zugänglich über:

- **Prüfungsgenerator**: [fra-gen.sfs-bayern.de](https://fra-gen.sfs-bayern.de)
- **Lernportal**: [feuerwehr-lernbar.bayern](https://www.feuerwehr-lernbar.bayern)

Format: 214 Multiple-Choice-Fragen mit je 3 Antwortmöglichkeiten (1 richtig), 5 davon mit Gefahrzeichen-Abbildungen.

### Rechtlicher Hinweis

Dies ist ein **privates, nicht-kommerzielles Projekt** zur persönlichen Prüfungsvorbereitung. Es besteht **keine Verbindung** zur Staatlichen Feuerwehrschule Würzburg oder zum Bayerischen Staatsministerium des Innern.

Die Fragen wurden **unverändert** aus dem öffentlich zugänglichen Fragenkatalog übernommen. Die Veröffentlichung erfolgt unter Berufung auf [§ 5 Abs. 2 UrhG](https://dejure.org/gesetze/UrhG/5.html) (amtliche Werke, die im öffentlichen Interesse zur allgemeinen Kenntnisnahme veröffentlicht worden sind) mit vollständiger Quellenangabe.

Bei Fragen oder Beanstandungen wenden Sie sich bitte an die Staatliche Feuerwehrschule Würzburg: **lehrmittel@sfs-w.bayern.de**

## Lizenz

Der **Quellcode** dieses Projekts steht unter der [MIT-Lizenz](LICENSE).

Die **Prüfungsfragen und Abbildungen** sind Eigentum der Staatlichen Feuerwehrschule Würzburg und unterliegen deren Nutzungsbedingungen.
