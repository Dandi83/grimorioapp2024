# PROMPT 48 — Proprietà delle armi: nome inglese, pagina dedicata e ricerca (2 novembre 2026)

- Nomi inglesi (`lib/data/nomi-inglesi-srd.json`, «proprieta», per edizione), dai PDF inglesi: SRD 5.1 p. 64 (Ammunition, Finesse) e p. 65 (Heavy, Light, Loading, Range, Reach, Special, Thrown, Two-Handed, Versatile); SRD 5.2.1 p. 89 (Ammunition, Finesse, Heavy, Light) e p. 90 (Loading, Range, Reach, Thrown, Two-Handed, Versatile). «Special» solo 2014.
- Proprietà in più: «Gittata» (Range) ha una voce di testo SRD propria in tutte e due le edizioni (e un riquadro nelle schede delle armi), trattata come le altre: 11 pagine.
- Pagine `/equipaggiamento/proprieta/<id>` (`lib/weapon-properties.ts`): una per proprietà con le due edizioni (selettore 2024 | 2014, `?edizione=2014`), testo da `propertyText` (lo stesso delle schede), armi dell'edizione nell'ordine della lista, attribuzione con la pagina dell'SRD dell'edizione. Statiche, nascoste con la sezione «armi». Canonical e sitemap: un indirizzo per proprietà, come le altre schede di equipaggiamento con due edizioni; «(2014)» nel titolo solo per Speciale.
- Scheda dell'arma (2014 e 2024): «Leggera (Light)» e «Tutte le armi con Leggera ›» in ogni riquadro delle proprietà (anche Gittata). La lista resta in italiano.
- Ricerca: sezione «Proprietà delle armi», un risultato per nome che vale per le due edizioni; Speciale solo 2014.
- Nome: «Due mani» come nella tabella delle armi di tutte e due le edizioni (il manuale 2024 intitola la voce «A due mani»).
