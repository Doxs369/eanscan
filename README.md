# ScanEan - Gestione Dispensa

App PWA per la gestione intelligente della dispensa domestica, con scansione barcode, tracking scadenze, ricette smart e lista della spesa automatica.

## Funzionalità

- **Scanner Barcode & QR**: Scansiona codici EAN e QR con la fotocamera del dispositivo
- **Foto prodotto**: Scatta una foto al prodotto per identificarlo visivamente
- **Tracking scadenze**: Monitoraggio colorato (🟢🟡🔴) con conto alla rovescia
- **Categorie**: Latticini, Carne, Verdura, Dispensa, Bevande, Dolci, Altro
- **Ricette Smart**: Suggerimenti che usano i prodotti in scadenza
- **Lista della spesa Smart**: Si popola automaticamente quando i prodotti scadono o vengono consumati
- **Indice Spreco**: Statistiche su consumati vs sprecati
- **Posizione**: Traccia dove è conservato ogni prodotto (Frigo, Dispensa, Congelatore...)
- **Note personalizzate**: Aggiungi informazioni extra per ogni prodotto
- **Statistiche dettagliate**: In dispensa, entro 3 giorni, consumati, sprecati

## Installazione

1. Scarica tutti i file in una cartella
2. Apri `index.html` in un browser moderno (Chrome, Safari, Edge)
3. Su mobile: Aggiungi alla schermata Home per installare come PWA

## File

- `index.html` — Struttura UI completa
- `app.js` — Logica applicativa
- `manifest.json` — Configurazione PWA
- `icons/` — Icone (da creare)

## Tecnologie

- HTML5, CSS3, Vanilla JavaScript
- LocalStorage per persistenza dati
- MediaDevices API per fotocamera
- PWA (Service Worker opzionale)

## Sponsor

Risparmia il 20% sulla spesa con il codice **SCANEAN20**
