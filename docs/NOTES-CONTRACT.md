# AIV Notes Contract (M1 + M2)

**Owner:** Baruch (data model)  
**Implementer:** Nehemiah (Next.js writer/reader wiring)  
**UI distinction / chrome:** Bezalel (olive pane — see `/workspace/aiv-design/distinction.md` and `aivnotes-writer-tokens.md`)  
**Keyed by:** Kevin (M1 aiv-notes; M2 rich body + ranges)

Schema: `/workspace/aiv-notes/schema.json`  
Example: `/workspace/aiv-notes/example-GEN.1.1.json`  
Range example: `/workspace/aiv-notes/example-GEN.1.1-3.json`

---

## Never Scripture

- Every note carries `label`: **`Kevin's comment (not Scripture)`** (required const, ASCII apostrophe U+0027).
- UI must render that label verbatim at the top of every note block (and empty pane / mobile sheet).
- Notes are **not** USX `f` / `x` apparatus and **not** translator `add` italics.
- Notes must **never** be merged into a Bible API chapter JSON, local USX asset, or Scripture column.
- Rich formatting and in-body scripture links do **not** make the note body Scripture.

---

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
| `verseIds` | non-empty unique `GEN.1.1`-style keys (see Range → verseIds) |
| `body.format` / `body.text` | `markdown` or `document` + non-empty markdown/`text` |

Optional: `body.document` (TipTap JSON when `format` is `document`), `scriptureCite` (excerpt only — no chapter dump), `tags`, `revisions`.

---

## M2 — Rich note body

### Formats

| `body.format` | Durable field | Notes |
|---------------|---------------|--------|
| `markdown` | `body.text` | Default. Source of truth. |
| `document` | `body.document` (TipTap/ProseMirror JSON) **and** `body.text` | TipTap may need the flag; **`text` remains required** as a markdown serialization for search, diff, and non-TipTap surfaces. |

### Allowed inline markup (in `body.text`)

- **Bold:** `**bold**`
- *Italic:* `*italic*`
- External link: `[label](https://example.com)` — https/http only in writer policy; no `javascript:` URLs
- Scripture references (in-body citations, not the attachment range):
  - Wiki form: `[[GEN.1.1]]` → verseId `GEN.1.1`
  - Display form: `GEN 1:1` → `GEN.1.1`
  - Inclusive same-chapter span: `GEN 1:1–3` or `GEN 1:1-3` → `GEN.1.1`, `GEN.1.2`, `GEN.1.3`

In-body refs are for linking/preview inside the comment. They do **not** automatically rewrite `range` / `verseIds` (those describe where the note is **attached**). Writer may offer "add cited verses to attachment" as an explicit action later; M2 does not require it.

Rendered scripture chips in the note body open the **reader** to that verse; they must stay visually distinct from the Scripture column (Bezalel).

### Non-goals (body)

- No HTML paste as Scripture.
- No embedding full chapter JSON in `body`.
- No HelloAO commentary compiler (still stub only).

---

## M2 — Range selection → `verseIds`

`range` is the **attachment** (which verses the note hangs on). `verseIds` is the index key list.

### M2 expansion rule (required)

1. UI range selection is **inclusive**.
2. **First milestone:** contiguous **same book + same chapter** only.
3. Given `range.start` and `range.end` with equal `book` and `chapter`, and `start.verse <= end.verse`:

   `verseIds = [ "{book}.{chapter}.{v}" for v in start.verse .. end.verse inclusive ]`

   Example: start `GEN 1:1`, end `GEN 1:3` → `["GEN.1.1","GEN.1.2","GEN.1.3"]`.

4. Single verse: start = end → one verseId.
5. On save, writer **must** recompute `verseIds` from `range` (do not trust a stale client list).
6. Index each id under `data/aiv-notes/by-verse/{verseId}.json` (note may appear under multiple verse keys).

### Deferred (not M2)

- Cross-chapter or cross-book ranges
- Non-contiguous multi-select
- VerseId lists that disagree with `range` (treat as invalid save)

### Normalization

- Book codes: USFM three-letter (`GEN`, `PSA`, `JHN`), not display names.
- Display "Genesis 1:1" in UI is fine; persist only USFM refs in `range` / `verseIds`.

---

## M2 — Mobile data rules (sheet chrome = Bezalel)

**Data only** — Bezalel owns sheet chrome, gestures, and layout.

1. Selecting a verse in the Scripture column opens a note **compose/edit** surface bound to that verse.
2. New note defaults:
   - `range.start` = `range.end` = selected verse
   - `verseIds` = `[ that verseId ]`
   - `label` = schema const
   - `status` = `draft-for-kevin`
   - `visibility` = `private` (unless Kevin's writer prefs say otherwise)
3. Existing notes for that `verseId` (from by-verse index) are listed/editable in the same surface; empty state still shows the never-Scripture label.
4. Saving updates `by-id` and all `by-verse` index entries for the note's `verseIds`.
5. Closing the sheet without save discards unsaved body; do not write partial notes to chapter payloads.

---

## verseIds (join keys)

Canonical join key: `{USFM}.{chapter}.{verse}` — e.g. `GEN.1.1`.  
Independent of translation wording. Index and fetch notes by these keys, not by displayed text.

---

## status / visibility (writer policy)

- `draft-for-kevin` — work in progress; prefer `private` or `house`.
- `approved-by-kevin` — Kevin has approved the wording.
- **App policy:** `visibility: public` should require `status: approved-by-kevin`. Enforce in the writer; do not rely on schema alone.

---

## Storage keys (Next.js writer)

Keep notes **outside** Scripture corpora:

| Purpose | Path / key |
|---------|------------|
| Note document | `data/aiv-notes/by-id/{id}.json` |
| Verse index | `data/aiv-notes/by-verse/{verseId}.json` → array of note `id`s |
| Schema copy (optional) | `data/aiv-notes/schema.json` |

**Forbidden:** any path under `data/blb-draft/`, hashed USX assets, HelloAO chapter cache, or Seed Bible translation payloads.

If client cache is used: prefix `aiv.notes.v1.*` only — never reuse Bible chapter cache keys.

---

## Must never ship in a Bible API / chapter payload

Do **not** put any of these into Free Use Bible API responses, local chapter JSON, or USX:

- `body`, `label`, `status`, `visibility`, `revisions`, `tags`, `scriptureCite`, `author`, note `id` / `kind`
- Any wrapper that would make Kevin's comment look like verse text

Reader join: load chapter from Scripture source → separately load notes by `verseIds` → render in the notes pane / sheet only.

---

## HelloAO commentary stub (no compiler)

Future optional reader route (stub only):

- `GET /api/c/aiv-notes/?verseId=GEN.1.1` → `AIVNote[]` from local `data/aiv-notes/`
- Later: possible HelloAO-shaped commentary JSON adapter

**Out of scope for M1 and M2:** building a HelloAO commentary compiler, publishing notes to AO Lab, or wiring AnnotationsManager as Scripture. See `helloao-commentary-stub.md`.

---

## Stop

- No `main` / production notes pane without Kevin's explicit yes.
- Do not alter displayed Scripture wording to carry notes.
- Do not ship TipTap/`document` without keeping `body.text` markdown serialization.
