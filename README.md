# BauLeiter Tool - Multi-File Version

## 📁 Projekt-Struktur

```
bauleiter-tool/
├── index.html              # Haupt-Datei: HTML + CSS + Modul-Loader
├── manifest.json           # PWA Manifest
├── service-worker.js       # Service Worker für Offline-Funktionalität
└── modules/
    ├── shared.js           # State, Konstanten, DB, Utils, Navigation
    ├── dashboard.js        # Dashboard-Ansicht
    ├── projekte.js         # Projekt-Verwaltung + BZP Generator
    ├── aufgaben.js         # Aufgaben & Mängel
    ├── bautagebuch.js      # Bautagebuch + Begehungen
    ├── kontakte.js         # Firmendatenbank
    ├── reporting.js        # Anlagen + WEA-SVG + BESS + Reporting
    ├── kostenschaetzung.js # Preisdatenbank + Kalkulation + Schätzung
    ├── pruefungen.js       # Prüfungen + Bauzeitplan
    └── einstellungen.js    # Settings + Backup + Erinnerungen
```

## 🚀 VS Code Setup (2 Minuten)

### Option A: Live Server Extension (Empfohlen)

**1. Extension installieren:**
- VS Code öffnen
- `Strg+Shift+X` (Extensions)
- "Live Server" suchen (von Ritwick Dey)
- "Install" klicken

**2. Projekt öffnen:**
```bash
code /pfad/zum/bauleiter-tool
```

**3. Live Server starten:**
- Rechtsklick auf `index.html`
- "Open with Live Server"
- → Browser öffnet automatisch: `http://127.0.0.1:5500`

**✅ Vorteile:**
- Auto-Reload bei Datei-Änderungen
- Kein Terminal nötig
- CORS-Probleme gelöst

---

### Option B: Python Server (Falls Live Server nicht funktioniert)

```bash
cd /pfad/zum/bauleiter-tool
python -m http.server 8000
```
→ Browser öffnen: `http://localhost:8000`

---

### Option C: Node.js npx serve

```bash
cd /pfad/zum/bauleiter-tool
npx serve .
```

---

## ⚠️ Wichtig: CORS & Module

**Doppelklick auf `index.html` funktioniert NICHT mehr!**
- Grund: Browser blockiert ES6-Module bei `file://` Protokoll
- Lösung: Einer der drei Server oben verwenden

---

## 🔧 Entwicklung

### Git Diff ist jetzt präzise:
```bash
git diff modules/reporting.js
# Zeigt nur Änderungen in reporting.js, nicht 7500 Zeilen
```

### Code-Folding in VS Code:
- Jede Funktion ist kollabierbar
- Strg+K, Strg+0 = Alles falten
- Strg+K, Strg+J = Alles entfalten

### Module bearbeiten:
1. Datei in `modules/` öffnen
2. Funktionen ändern
3. Speichern
4. Live Server lädt automatisch neu

---

## 📦 PWA Installation

**Desktop:**
- Chrome: Adressleiste → ⊕ Icon → "Installieren"
- Edge: Adressleiste → App-Icon → "BauLeiter Tool installieren"

**Mobile:**
- Safari iOS: Teilen → "Zum Home-Bildschirm"
- Chrome Android: Menü → "Zum Startbildschirm hinzufügen"

---

## 🔄 Zurück zu Single-File?

Falls Multi-File doch zu komplex:

```bash
# Alle Module zusammenführen
cat index.html \
  modules/shared.js \
  modules/dashboard.js \
  modules/projekte.js \
  modules/aufgaben.js \
  modules/bautagebuch.js \
  modules/kontakte.js \
  modules/reporting.js \
  modules/kostenschaetzung.js \
  modules/pruefungen.js \
  modules/einstellungen.js \
  > bauleiter-tool-single.html

# Dann <script type="module"> zu <script> ändern
# und import-Zeilen entfernen
```

---

## 💾 Backup & Migration

- **IndexedDB bleibt gleich:** `bauleiter:*` Keys unverändert
- **Auto-Backup:** Funktioniert wie vorher (Einstellungen)
- **Daten bleiben:** Projekt-Daten sind Browser-lokal, nicht in den Dateien

---

## 📊 Modul-Übersicht

| Modul               | Zeilen | Hauptfunktionen                                    |
|---------------------|--------|----------------------------------------------------|
| shared.js           | ~300   | State, DB, Navigation, Modal, Render-Router        |
| dashboard.js        | ~120   | Dashboard mit Projekt-Kacheln                      |
| projekte.js         | ~770   | Projekt-Detail, BZP Generator, Kennwerte           |
| aufgaben.js         | ~150   | Aufgaben & Mängel-Verwaltung                       |
| bautagebuch.js      | ~540   | Bautagebuch, Begehungen, Erkenntnisse, Print       |
| kontakte.js         | ~200   | Firmendatenbank, Tags, E-Mail                      |
| reporting.js        | ~1200  | Anlagen (Wind/BESS), WEA-SVG, Reporting-Hub        |
| kostenschaetzung.js | ~3350  | Preisdatenbank, Kalkulation, Schätzung, Katalog    |
| pruefungen.js       | ~870   | Prüfungen, Bauzeitplan                             |
| einstellungen.js    | ~530   | Theme, Backup, Erinnerungen, Hilfe                 |

**Total:** ~7500 Zeilen → jetzt auf 11 Dateien verteilt

---

## 🐛 Troubleshooting

**Problem:** Blank screen nach Änderung
- **Lösung:** Browser-Konsole öffnen (F12) → Fehler checken
- Meist: Tippfehler in Export oder fehlende Funktion

**Problem:** "Failed to load module"
- **Lösung:** Server läuft? Pfad richtig? (relativ: `./modules/`)

**Problem:** IndexedDB leer
- **Lösung:** Andere Browser-Domain? (localhost vs. 127.0.0.1)
- Backup aus Einstellungen wiederherstellen

**Problem:** Module werden nicht geladen
- **Lösung:** Konsole → Netzwerk-Tab → Blockierte Requests checken
- Eventuell Browser-Extension (AdBlock) deaktivieren

---

## 📞 Support

Bei Problemen:
1. Browser-Konsole checken (F12)
2. Fehler notieren
3. Datei hochladen + Fehlermeldung teilen
