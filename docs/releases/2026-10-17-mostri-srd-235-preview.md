# 235 mostri SRD 5.2.1 italiano — preview

Richiesta autorizzata: integrazione nativa confermata da Daniele il 17 ottobre 2026. Solo preview.

- Preview verificata: https://grimorioapp2024-94saaejdg-grimorio-app.vercel.app/bestiario
- Commit applicativo verificato: ea622bfe660b641995da8108ef49a85b215ced8f.
- Branch: preview/mostri-srd-235-20261017.
- Produzione invariata: e79551b41bbd19ed56a2966e6917c73a1790a5c8, deployment dpl_A5x5NQKCV9Z4VE96eq7G6juwdfDD.
- 235 schede uniche dalle pagine 294–384, Aboleth compreso. Esclusi animali e sei blocchi speciali.
- Il catalogo live contiene 235 voci: nessun record legacy aggiuntivo era restituito dal DB durante la verifica. La precedenza dei record esistenti è comunque conservata e testata.
- Nessuna scrittura sul database, nessuna modifica agli incantesimi.

## Verifiche superate

- PDF SHA-256 a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718.
- Confronto indipendente con le 235 voci dell'indice cartaceo.
- Testi integrali di tutte le capacità, statistiche, sei caratteristiche, modificatori e sei tiri salvezza confrontati con il PDF.
- Tutti i 235 URL online: HTTP 200, nome, pagina ufficiale e testo effettivamente renderizzato delle sezioni uguale ai dati verificati.
- npm test: controlli esistenti e nuovi superati, 235 schede renderizzate, protezione dell'attribuzione sui record modificati, nessun duplicato, catalogo produzione invariato.
- Build locale con webpack superata; build Vercel standard pronta sul commit applicativo verificato.
- Revisione indipendente: corretti apostrofi HTML e categoria non morto dello sciame; due regressioni riprodotte in RED e risolte in GREEN, suite completa verde.
- Browser cloud desktop: catalogo 235, ricerca Orda, scheda reale e fonte verificati visivamente.
- Confronto online dei testi visibili di /grimorio, /spell/amicizia, /spell/frusta-di-spine e /mostro/aboleth: preview identica alla produzione.

## Verifiche incomplete

- Responsive 390/430 px e dispositivo fisico iPhone: non verificati. Il browser locale di test non può avviarsi per socket() Operation not permitted; il browser cloud disponibile non espone il ridimensionamento del viewport. Non è un errore osservato dell'app.
- Round trip dei preferiti in browser: non eseguito. Il controllo automatico ha respinto il tentativo di clic perché considerato modifica dell'app sotto il precedente vincolo di sola lettura. Nessun dato preferiti è stato cambiato. ID e integrazione restano coperti dai test locali.
- Lo status non è ready e qaPassed non è true finché queste verifiche non sono completate; nessuna attestazione anticipata per l'automazione.

## Decisioni esecutive

- Base Git verificata tramite connettore; snapshot isolata e confronto degli hash dei cinque file esistenti interessati con main. Nessun fetch/reset della checkout originale.
- Boleto stridente conserva solo la reazione ufficiale: nessuna azione inventata per riempire il campo.
- Sottotitolo ufficiale conservato integralmente; categorie canoniche per ricerca e filtri, comprese varianti di taglia. Se la categorizzazione fosse errata potrebbe incidere sul filtro, non sui testi mostrati.
- La build locale usa webpack solo per il limite Turbopack relativo al symlink node_modules della snapshot; nessuna modifica di configurazione dell'app.
