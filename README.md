# ScanEan - Gestione Dispensa v2

App PWA per la gestione intelligente della dispensa domestica, con scansione barcode reale, tracking scadenze, ricette smart e lista della spesa automatica.

## Novità v2

- **Palette colori** basata sul logo ufficiale (verde teal #2daf91 + arancio coral #ff7d55)
- **Scanner barcode REALE** con Barcode Detection API (Chrome/Edge Android)
- **Tasto "Inserisci EAN"** per inserimento manuale quando la fotocamera non funziona
- **Database EAN integrato** con ricerca automatica per codici noti
- **Validazione EAN** (8-13 cifre) con messaggi di errore

## Funzionalità

- 📷 **Scanner Barcode & QR** con fotocamera reale (Barcode Detection API)
- ⌨️ **Inserimento manuale EAN** con validazione e database lookup
- 🖼️ **Foto prodotto** (scatta o carica)
- 🏷️ **Dati completi**: Nome, Marca, Categoria, EAN, Posizione, Note
- 🟢🟡🔴 **Tracking scadenze** con badge colorati
- 🍝 **Ricette smart** che usano prodotti in scadenza
- 🛒 **Lista spesa auto** (si popola quando consumi/sprechi)
- 📊 **Statistiche**: In dispensa, entro 3gg, consumati, sprecati, indice spreco
- 💾 **Persistenza** via LocalStorage
- 📱 **PWA** installabile su mobile

## Installazione

1. Scarica tutti i file in una cartella
2. Copia il logo in `logo.png`
3. Apri `index.html` in un browser moderno (Chrome, Edge, Safari)
4. Su mobile: Aggiungi alla schermata Home per installare come PWA

## File

- `index.html` — Struttura UI completa
- `app.js` — Logica applicativa con scanner reale
- `manifest.json` — Configurazione PWA
- `logo.png` — Logo dell'app (copia il tuo)
- `icons/` — Icone PWA (da creare)

## Compatibilità Scanner

| Browser | Supporto |
|---------|----------|
| Chrome Android | ✅ Barcode Detection API nativa |
| Edge Android | ✅ Barcode Detection API nativa |
| Safari iOS | ⚠️ Inserimento manuale EAN |
| Firefox | ⚠️ Inserimento manuale EAN |

## Tecnologie

- HTML5, CSS3, Vanilla JavaScript
- Barcode Detection API (Web Platform)
- MediaDevices API per fotocamera
- LocalStorage per persistenza
- PWA (Service Worker opzionale)

## Sponsor

Risparmia il 20% sulla spesa con il codice **SCANEAN20**
