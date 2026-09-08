# AIV Notes Contract (M1)

**Owner:** Baruch (data model)  
**Implementer:** Nehemiah (Next.js writer/reader wiring)  
**UI distinction:** Bezalel (olive pane — see `/workspace/aiv-design/distinction.md`)  
**Keyed by:** Kevin (M1 aiv-notes)

Schema: `/workspace/aiv-notes/schema.json`  
Example: `/workspace/aiv-notes/example-GEN.1.1.json`

## Never Scripture

- Every note carries `label`: **`Kevin's comment (not Scripture)`** (required const).
- UI must render that label verbatim at the top of every note block (and empty pane).
- Notes are **not** USX `f` / `x` apparatus and **not** translator `add` italics.
- Notes must **never** be merged into a Bible API chapter JSON, local USX asset, or Scripture column.

## Required fields

| Field | Rule |
|-------|------|
| `schemaVersion` | `1` |
| `id` | `aiv-note-[a-z0-9-]+` |
| `kind` | `aiv-note` |
| `label` | `Kevin's comment (not Scripture)` |
| `author` | name `Kevin Amundson`, role `interpreter` |
| `status` | `draft-for-kevin` \| `approved-by-kevin` |
| `visibility` | `private` \| `house` \| `public` |
| `createdAt` / `updatedAt` | ISO-8601 UTC |
| `range.start` / `range.end` | USFM book + chapter + verse |
| `verseIds` | non-empty unique `GEN.1.1`-style keys |
| `body.format` / `body.text` | `markdown` + non-empty text |

Optional: `scriptureCite` (excerpt only — no chapter dump), `tags`, `revisions`.

## verseIds

Canonical join key: `{USFM}.{chapter}.{verse}` — e.g. `GEN.1.1`.  
Independent of translation wording. Index and fetch notes by these keys, not by displayed text.

## status / visibility (writer policy)

- `draft-for-kevin` — work in progress; prefer `private` or `house`.
- `approved-by-kevin` — Kevin has approved the wording.
- **App policy:** `visibility: public` should require `status: approved-by-kevin`. Enforce in the writer; do not rely on schema alone.

## Storage keys (Next.js writer)

Keep notes **outside** Scripture corpora:

| Purpose | Path / key |
|---------|------------|
| Note document | `data/aiv-notes/by-id/{id}.json` |
| Verse index | `data/aiv-notes/by-verse/{verseId}.json` → array of note `id`s |
| Schema copy (optional) | `data/aiv-notes/schema.json` |

**Forbidden:** any path under `data/blb-draft/`, hashed USX assets, HelloAO chapter cache, or Seed Bible translation payloads.

If client cache is used: prefix `aiv.notes.v1.*` only — never reuse Bible chapter cache keys.

## Must never ship in a Bible API / chapter payload

Do **not** put any of these into Free Use Bible API responses, local chapter JSON, or USX:

- `body`, `label`, `status`, `visibility`, `revisions`, `tags`, `scriptureCite`, `author`, note `id` / `kind`
- Any wrapper that would make Kevin’s comment look like verse text

Reader join: load chapter from Scripture source → separately load notes by `verseIds` → render in the notes pane only.

## HelloAO commentary stub (M1 — no compiler)

Future optional reader route (stub only):

- `GET /api/c/aiv-notes/?verseId=GEN.1.1` → `AIVNote[]` from local `data/aiv-notes/`
- Later: possible HelloAO-shaped commentary JSON adapter

**Out of scope for M1:** building a HelloAO commentary compiler, publishing notes to AO Lab, or wiring AnnotationsManager as Scripture. See `helloao-commentary-stub.md`.

## Stop

- No `main` / production notes pane without Kevin’s explicit yes.
- Do not alter displayed Scripture wording to carry notes.
