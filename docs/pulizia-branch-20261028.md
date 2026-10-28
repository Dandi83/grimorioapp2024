# Pulizia dei branch remoti — 28 ottobre 2026

Situazione letta il 28 ottobre 2026 dall'API pubblica di GitHub: 185 branch remoti, 121 PR chiuse di cui 118 unite, nessuna PR aperta.

## Branch con PR unita in main: 116 da eliminare

Ognuno ha come ultimo commit esattamente quello unito con la sua PR (nessun commit aggiunto dopo il merge). La sessione cloud non ha potuto eliminarli: il push di cancellazione è rifiutato («remote end hung up»). Per eliminarli da un computer con accesso al repository:

```sh
git push origin --delete \
  admin/classi-2014-pulsante-20261026 \
  admin/correzioni-c1-20261021 \
  admin/correzioni-c2-20261021 \
  admin/filtro-provenienza-20261026 \
  admin/srd-modificate-20261026 \
  chore/eslint-20261019 \
  chore/protezione-dati-schede-20261020 \
  chore/pulizia-totale-20261019 \
  chore/qualita-codice-20261019 \
  ci/e2e-due-lavori-20261027 \
  data/habitat-mostri-20261024 \
  deps/aggiornamenti-sicurezza-20261019 \
  design-home-b \
  design-incantesimo-a \
  design-mostro-b \
  design-proposte \
  design/schede-computer-20261026 \
  docs/regola-report-finale-20261020 \
  feat/admin-edizioni-20261023 \
  feat/admin-icone-20261022 \
  feat/asterisco-no-srd-admin \
  feat/avanzamento-livello-20261021 \
  feat/avventura-2014-20261021 \
  feat/badge-notifiche-20261023 \
  feat/classi-2014-20261022 \
  feat/classi-2024-20261022 \
  feat/concentrazione-richiamo \
  feat/condizioni-2014-20261020 \
  feat/condizioni-compendio-20261021 \
  feat/edizione-unica-20261024 \
  feat/equipaggiamento-armature-20261021 \
  feat/equipaggiamento-armi-20261021 \
  feat/equipaggiamento-avventura-20261021 \
  feat/filtro-tempo-di-lancio-20261021 \
  feat/habitat-edizione-bestiario-20261020 \
  feat/homebrew-20261023 \
  feat/incantesimi-2014-blocco-1-20261020 \
  feat/incantesimi-2014-blocco-2-20261020 \
  feat/incantesimi-2014-blocco-3-20261020 \
  feat/incantesimi-2014-blocco-4-20261020 \
  feat/incantesimi-2014-blocco-5-20261020 \
  feat/incantesimi-2014-blocco-6-20261020 \
  feat/incantesimi-2014-blocco-7-20261020 \
  feat/licenza-homebrew-20261024 \
  feat/look-base-20261020 \
  feat/look-incantesimi-20261020 \
  feat/look-scheda-20261020 \
  feat/modifica-admin-20261024 \
  feat/no-srd-schede \
  feat/notifiche-push-20261022 \
  feat/occhio-schede-20261023 \
  feat/oggetti-magici-2014-20261021 \
  feat/oggetti-magici-20261021 \
  feat/ordine-campi-20261020 \
  feat/responsive-tablet-desktop-20261023 \
  feat/ricerca-home-20261021 \
  feat/schede-2014-blocco-1-20261020 \
  feat/schede-2014-blocco-2-20261020 \
  feat/schede-2014-blocco-3-20261020 \
  feat/schede-2014-blocco-4-20261020 \
  feat/schede-2014-blocco-5-20261020 \
  feat/schede-2014-blocco-6-20261020 \
  feat/schede-2014-blocco-7-20261020 \
  feat/segnalazioni-20261021 \
  feat/service-worker-offline-20261019 \
  feat/sezioni-visibili-20261022 \
  feat/sottoclassi-admin \
  feat/strumenti-20261021 \
  fix/accesso-admin-sicuro-20261019 \
  fix/admin-edizioni-identiche-20261023 \
  fix/admin-incantesimi-file-20261023 \
  fix/avviso-offline-20261020 \
  fix/avviso-offline-20261021 \
  fix/catalogo-2024-livelli-nomi-20261020 \
  fix/editor-mostri-campi-20261022 \
  fix/etichette-solo-admin \
  fix/formattazione-catena-20261024 \
  fix/indietro-editor-20261024 \
  fix/intestazioni-sicurezza-20261019 \
  fix/navigazione-messaggi-20261019 \
  fix/preferiti-robusti-20261019 \
  fix/respirare-sott-acqua-unico-20261020 \
  fix/sintesi-tabella-assente-20261026 \
  fix/tempi-di-lancio-elenco-20261021 \
  fix/tempo-lancio-breve \
  fix/testi-incantesimi-20261021 \
  fix/tipi-folletto-vegetale-20261024 \
  layout/spazio-riquadri-20261026 \
  perf/leggerezza-pulizia-20261026 \
  perf/prestazioni-catalogo-20261019 \
  perf/pulizia-peso-20261021 \
  regole/resistenza-immunita-vulnerabilita-20261026 \
  schede/no-srd-provenienza-20261026 \
  sec/sicurezza-20261021 \
  sezioni/in-costruzione-20261026 \
  style/formattazione-schede-20261019 \
  test/playwright-ci-20261019 \
  test/prova-offline-stabile-20261020 \
  ui/admin-home-20261024 \
  ui/info-legale-20261024 \
  ui/modifica-senza-scatto-20261024 \
  ui/pillola-ovunque-20261024 \
  ui/ritocchi-estetici-20261021 \
  ui/termini-bozza-20261024 \
  web/area-riservata-20261027 \
  web/condizioni-2014-traduzione-20261027 \
  web/installazione-browser-20261026 \
  web/logo-libro-d20-20261027 \
  web/marchi-rimozioni-nomi-20261027 \
  web/nomi-propri-incantesimi-20261028 \
  web/pillola-statistiche-email-20261028 \
  web/ricerca-tollerante-velocita-20261028 \
  web/sezioni-in-arrivo-20261026 \
  web/sicurezza-catalogo-20261027 \
  web/statistiche-b-20261027 \
  web/statistiche-installazioni-20261028
```

Oppure da GitHub: pagina Branches, icona del cestino accanto a ciascuno.

## Branch senza PR unita: 68 (non toccati, da decidere)

| Ultimo commit | Branch | Messaggio |
|---|---|---|
| 2026-10-26 | `data/classi-2014-incantesimi-20261026` | Script guidato: classi 2014 per 34 incantesimi aggiunti e nome di Paro |
| 2026-10-25 | `design-mostro-a` | Proposta scheda mostro A (sobria): righe delle proprietà separate, ele |
| 2026-10-25 | `design-incantesimo-b` | Proposta scheda incantesimo B (decisa): fascia nel colore della scuola |
| 2026-10-25 | `design-home-a` | Proposta Home A (sobria): citazione più compatta, filetto ambra, campo |
| 2026-10-25 | `avvio-leggero` | Test allineati al nuovo precaricamento (solo Incantesimi e Bestiario a |
| 2026-10-25 | `analisi-prestazioni` | Prestazioni: Home senza errore di idratazione, elenchi caricati solo d |
| 2026-10-19 | `perf/lista-incantesimi` | test: preserve exact URL filter regressions and audit pre-merge checks |
| 2026-10-19 | `fix/catalog-fluidity-20261019` | perf: reduce catalog rendering and duplicate detail reads |
| 2026-10-19 | `fix/bestiario-no-art-equipment-20261019` | fix: archive creature illustrations and use Equipaggiamento consistent |
| 2026-10-19 | `fix/admin-creature-fields-20261019` | fix: complete creature editor fields and link plain casting lists |
| 2026-10-19 | `docs/release-creature-editor-20261019` | docs: record published creature editor release and verification limits |
| 2026-10-19 | `docs/catalog-fluidity-release-20261019` | docs: record published catalog performance changes |
| 2026-10-19 | `docs/bestiario-no-art-release-20261019` | docs: record published no-art bestiary release |
| 2026-10-18 | `ui/official-creature-art-20261018` | preview: extend credited official artwork to 336 source-checked creatu |
| 2026-10-18 | `ui/detail-only-edition-badges-20261018` | ui: show rules edition badges only on individual detail pages |
| 2026-10-18 | `ui/compact-art-credits-20261018` | ui: keep compact artwork attribution on cards and centralize credits |
| 2026-10-18 | `release/prepared-art-20261018` | release: enable approved prepared creature artwork in production |
| 2026-10-18 | `release/official-art-20261018` | release: enable approved official creature artwork and compact credits |
| 2026-10-18 | `release/avif-images-20261018` | docs: record verified AVIF delivery, WebP fallback and measured saving |
| 2026-10-18 | `preview/titoli-cataloghi-contatori-20261018` | preview: rename catalog headings and show dynamic totals in parenthese |
| 2026-10-18 | `preview/personaggi-20261017` | fix: preserve live character edits during portrait upload and record d |
| 2026-10-18 | `preview/official-monster-art-20261018` | preview: trial official Aboleth and Owlbear artwork with separate cred |
| 2026-10-18 | `preview/mostri-legacy-2014-20261018` | ui: show only D&D rules edition on monster list badges |
| 2026-10-18 | `preview/lich-separatori-20261018` | preview: organize all condition effects into readable sections with di |
| 2026-10-18 | `preview/lich-formattazione-rimandi-20261018` | preview: format monster prose, move reference panels below and link ci |
| 2026-10-18 | `preview/icone-danni-mostri-20261018` | preview: extend damage icons to all monster sections and spell tables |
| 2026-10-18 | `preview/icone-danni-20261018` | preview: add contextual BG3 damage icons to spell descriptions |
| 2026-10-18 | `preview/home-portale-20261018` | feat: introduce portal Home with Bestiario and favorites access |
| 2026-10-18 | `preview/esempio-link-condizione-20261018` | preview: demonstrate underlined condition link in Hold Person |
| 2026-10-18 | `preview/elenco-incantesimi-senza-asterischi-20261018` | ui: hide spell provenance asterisks in catalog rows |
| 2026-10-18 | `preview/condizioni-inline-complete-20261018` | feat: link condition mentions across spells and monsters with public c |
| 2026-10-18 | `preview/bollini-provenienza-20261018` | feat: show verified monster source and rules edition badges |
| 2026-10-18 | `preview/bestiario-mostri-animali-20261018` | feat: organize Bestiario into monster and animal sections |
| 2026-10-18 | `preview/admin-tendine-20261018` | feat: add quick dropdown choices to monster editor |
| 2026-10-18 | `preview/admin-incantesimi-guidato-20261018` | feat: guide spell entry with dropdowns and visual preview |
| 2026-10-18 | `preview/admin-guidato-20261018` | feat: simplify monster entry with guided blocks and visual preview |
| 2026-10-18 | `preview/admin-etichette-20261018` | feat: choose D&D edition labels in monster and spell administration |
| 2026-10-18 | `perf/prepared-art-pilot-20261018` | perf: preview prepared creature artwork with loading placeholders for  |
| 2026-10-18 | `perf/prepared-art-catalog-20261018` | perf: prepare all approved creature artwork at build time for preview |
| 2026-10-18 | `perf/catalog-list-payload-20261018` | perf: send lightweight catalog summaries and stream navigation loading |
| 2026-10-18 | `perf/avif-creature-images-20261018` | perf: negotiate AVIF with WebP fallback and record image weight audit |
| 2026-10-18 | `fix/elenco-incantesimi-asterischi-20261018` | fix: remove provenance asterisks from public spell lists |
| 2026-10-18 | `fix/admin-componenti-vuote-20261018` | fix: show empty component selection for new spells |
| 2026-10-18 | `feat/unified-edition-badges-20261018` | style: unify spell and monster edition badges as D&D5e with book icon |
| 2026-10-18 | `feat/share-public-cards-20261018` | feat: share spell, monster and animal cards via native sharing and pub |
| 2026-10-18 | `feat/il-grimorio-header-20261018` | feat: brand home as Il Grimorio.App and restore bottom favorites |
| 2026-10-18 | `feat/home-sizing-20261018` | style: enlarge home branding and bottom navigation, tighten legal link |
| 2026-10-18 | `feat/home-info-20261018` | feat: move legal information into Info navigation and refine home head |
| 2026-10-18 | `feat/home-essenziale-20261018` | feat: publish approved minimal library homepage |
| 2026-10-18 | `feat/grimorio-analytics-sync-20261018` | fix: claim analytics exports atomically and preserve event UUIDs acros |
| 2026-10-18 | `feat/grimorio-analytics-20261018` | feat: consent-based Grimorio analytics with private dashboard and EU P |
| 2026-10-18 | `feat/catalog-edition-labels-20261018` | feat: place compact edition labels beside monster and spell names |
| 2026-10-18 | `feat/admin-return-to-site-20261018` | feat: add return to public site button to admin dashboard and login |
| 2026-10-18 | `feat/admin-editor-editions-20261018` | feat: edit rules edition in admin spell and monster forms with atomic  |
| 2026-10-18 | `feat/accesso-amministrazione-home-20261018` | feat: link to reserved administration from home footer |
| 2026-10-18 | `docs/webp-rollback-20261018` | docs: record AVIF regression, verified WebP rollback and device valida |
| 2026-10-18 | `docs/web-ios-coordination-20261018` | docs: require coordination between web and iPhone development chats |
| 2026-10-18 | `docs/prepared-art-pilot-runtime-20261018` | docs: record static artwork preview runtime verification |
| 2026-10-18 | `docs/ios-readiness-20261018` | docs: assess iOS readiness, offline architecture and App Store release |
| 2026-10-18 | `cloud/grimorio-ios-20261018` | docs: prepare Grimorio cloud continuity, agent instructions and reprod |
| 2026-10-17 | `preview/srd-italiano-20261017` | Mark ten unverified legacy descriptions with accessible name asterisks |
| 2026-10-17 | `preview/originali-39-20261017` | Complete 39 empty spells with original 2024 rules summaries and proven |
| 2026-10-17 | `preview/originali-10-20261017` | Replace ten legacy non-SRD descriptions with original 2024 rules summa |
| 2026-10-17 | `preview/mostri-srd-235-20261017` | Document numeric ordering of favorite spells and monsters |
| 2026-10-17 | `preview/menu-hobby-20261017` | Rename bottom navigation, remove dice section and update hobby disclai |
| 2026-10-17 | `preview/manuale-srd-20261017` | fix: separate manual classes, backgrounds and species |
| 2026-10-17 | `preview/aboleth-srd-20261017` | Label monster experience values with PX without duplicating existing l |
| 2026-10-17 | `fix/dardo-incantato-20261017` | Fill approved Magic Missile description with guarded database migratio |
