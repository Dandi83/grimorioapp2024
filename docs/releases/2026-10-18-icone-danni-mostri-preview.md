# Icone danni — incantesimi e mostri, solo preview

Estensione del design approvato sul commit e0a26ec887e126d8393360fc792a2709c3b7a942.

Il componente condiviso decora i 13 tipi di danno nelle descrizioni di tutti gli incantesimi (inclusi i riepiloghi degli spiriti) e nelle sezioni dei mostri: tratti, azioni, azioni bonus, reazioni, azioni leggendarie e descrizione. I valori di vulnerabilità, resistenze e immunità ereditano il contesto dalla propria etichetta. Tiri salvezza, abilità e immunità alle condizioni restano testo normale.

Le tabelle mantengono testo, spazi e a capo originali; il riconoscimento gestisce anche i nomi spezzati dalla sillabazione PDF. Le icone decorative sono escluse dalla lettura assistiva. Nessuna modifica a dati, valori, database o ambiente di produzione.

Verifiche: suite npm test; build Next.js con webpack e TypeScript; conservazione del testo di tutti i record SRD e dei riepiloghi originali; liste di danni, contesti ambigui, HTML sicuro, tabelle e pagina effettiva dei mostri.

La verifica online su preview e alle larghezze mobile/desktop viene eseguita dopo il rilascio. Non costituisce prova su iPhone fisico.
