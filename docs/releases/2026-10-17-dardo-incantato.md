# Dardo Incantato — approved content correction (2026-10-17)

Scope: fill only the empty description of `dardo-incantato` in the existing
Grimorio production database. The Italian wording was reviewed and approved
in the project conversation. It is a paraphrase, not the official Italian
Player's Handbook text.

Reference: https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions#MagicMissile

The seed JSON preserves the approved description for future imports. Existing
database descriptions are never replaced, including later edits.

Verification, using the app's configured environment:
`node scripts/fill-magic-missile.mjs --verify`
This exercises the real update inside a rolled-back transaction, confirms
idempotency and conflict protection, checks that unrelated rows stay intact,
and confirms that the original row is restored.

Release, only after successful verification and application build:
`node scripts/fill-magic-missile.mjs --apply`
This requires the expected Neon and Vercel project IDs and Vercel's production
environment. It commits only an empty description and verifies the saved value.
It is invoked explicitly for this release; normal builds and requests do not
run the correction. No database credentials are stored in the repository.

Before this release: 369 spells; 282 empty descriptions (live audit).
Expected after this release, absent concurrent edits: 369 spells; 281 empty
descriptions.

Content rollback: restore only this spell's description to its previously empty
value after verifying nobody has edited it since. Rolling back a Vercel code
deployment does not roll back database content.
