# HelloAO commentary stub (M1)

**Status:** stub path only — **do not build the compiler in M1.**

## Intended later shape

1. Local store remains source of truth: `data/aiv-notes/by-id/*.json` per `schema.json`.
2. Reader API (future): `GET /api/c/aiv-notes/?verseId=GEN.1.1`  
   - Returns `AIVNote[]` filtered by `verseIds` and visibility policy.  
   - Never returns Scripture verses.
3. Optional later adapter: map approved public notes into a HelloAO-compatible commentary JSON document for tooling that expects AO Lab commentary layout — **not** a Free Use Bible API translation id, and **not** mixed into chapter payloads.

## Explicit non-goals (M1)

- No compiler that transforms USX / chapter JSON into notes.
- No upload of notes into `bible.helloao.org` or AO Lab catalogs.
- No Seed Bible `AnnotationsManager` as a Scripture channel.
- No claim that notes are BLB, BSB, or any translation.

## Handoff

When Kevin keys M2+, Baruch updates this stub; Nehemiah implements the route; Bezalel keeps the olive notes pane visually distinct.
