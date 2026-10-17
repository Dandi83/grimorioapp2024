# Manuale SRD — preview del 17 ottobre 2026

Preview: https://grimorioapp2024-5so95qdlz-grimorio-app.vercel.app/manuale

Branch: `preview/manuale-srd-20261017`  
Commit applicativo: `98e0e10b4ef5d6e513664439789adc222d457638`  
Deployment: `dpl_LFfJB7ExsHa7UGqhGuqSddAseQcB` (READY, preview)

## Contenuti

- Accesso Manuale dalla Home, ricerca nel testo, categorie e raccolte personaggi.
- 95 animali dell'appendice italiana (pagine 385–405), catalogo preview totale 330 creature.
- 15 condizioni ufficiali, consultabili dalle schede tramite pannelli chiudibili senza navigazione.
- Collegamenti agli incantesimi esplicitamente nominati nelle statistiche dei mostri; classi con incantesimi collegate al filtro del Grimorio.
- 14 capitoli di equipaggiamento e 29 voci personaggi: 12 classi con sottoclassi SRD, 9 specie, 4 background, creazione, origini e talenti. Consultazione, senza generatore automatico PG.
- Testi italiani ufficiali, tabelle conservate con colonne e scorrimento orizzontale, fonte/pagine e attribuzione per voce.

## Verifica

- `python scripts/check-srd-animals.py`: 95 nomi univoci e indice cartaceo, testo completo, sei caratteristiche e tiri salvezza, hash fonte.
- `python scripts/check-manual-source.py`: copertura del testo e di tutti i caratteri/numeri delle tabelle; associazione delle tabelle a Tiefling, Dragonide ed Elfo verificata separatamente.
- `npm test`: superato, incluse regressioni incantesimi, mostri, preferiti, ordinamenti e isolamento produzione.
- `npm run build -- --webpack`: superato; webpack usato localmente per il symlink node_modules. Build Vercel standard: READY.
- Verifica HTTP sulla preview: **153/153** pagine superate, tutte le 58 voci con blocchi di testo e tabelle presenti nell'HTML, 95 animali con nome e fonte.
- Browser desktop: Home → Manuale; filtro condizioni e ricerca; filtro specie (9), classi (12), equipaggiamento (14); tabella Tiefling corretta e scorrimento confinato; Animali (95), ricerca Piovra; pannelli Afferrato/Trattenuto, chiusura pulsante/Esc; Lich → Invisibilità → condizione → Manuale; Mago → Grimorio filtrato.
- Review indipendente completata; corretta l'associazione della tabella Retaggi immondi e limitato il filtro raccolte alla preview.

## Limiti e produzione

Controllo su telefono reale e viewport mobile 390/430 non completato: il browser disponibile non espone ridimensionamento e il browser locale non può avviarsi per un limite del runtime. Non si dichiara QA mobile superato.

Produzione invariata: `grimorioapp2024.vercel.app`, deployment `dpl_A5x5NQKCV9Z4VE96eq7G6juwdfDD`, commit `e79551b41bbd19ed56a2966e6917c73a1790a5c8`. Nessuna scrittura DB; nessuna promozione in produzione.

Fonte: SRD 5.2.1 italiano, https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf  
SHA256 PDF: `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
