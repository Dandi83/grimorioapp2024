# Pubblicazione completa SRD e asterischi — 17 ottobre 2026

Autorizzazione in chat: pubblicare ufficialmente l'app e contrassegnare i dieci testi preesistenti fuori SRD con un piccolo asterisco accanto al nome.

- Include i 20 nuovi incantesimi del manifesto `srd-additions-20261017.json`.
- Prima del rilascio: test completi, build e verifica della migrazione con ROLLBACK.
- Esecuzione definitiva autorizzata: `npm test && npm run build && node scripts/migrations/add-20-srd.mjs --verify && node scripts/migrations/add-20-srd.mjs --apply`, come override della sola distribuzione production; nessuna migrazione nelle build ordinarie.
- Solo INSERT delle venti schede mancanti; nessuna modifica alle descrizioni o ai nomi esistenti. Le dieci descrizioni sono conservate come richiesto dall'utente.
- Asterisco piccolo oro su catalogo, preferiti (componente condiviso), scheda e amministrazione. ID e nomi nel database restano invariati; ricerca e preferiti preservati.
- La nota nella scheda e la legenda Fonti spiegano che fonte e permesso di riutilizzo del testo non sono verificati; il simbolo non rende autorizzata la ripubblicazione e non qualifica l'incantesimo come inventato.
- Attesi: 389 schede totali, 340 schede SRD / 339 incantesimi distinti, dieci testi con asterisco, 39 descrizioni ancora vuote.
- Rollback del codice non annulla gli INSERT nel database. Nessuna rimozione automatica delle nuove schede.
