# AIV Notes — M1 product SPEC

**Repo (Nehemiah lands):** new `aiv-notes` (or house-named equivalent) — not merge into Seed Bible AGPL tree without Kevin’s key.  
**Domain (intended later):** notes live beside Scripture on AIV surfaces; M1 may ship as a repo + preview first.  
**Keyed:** Eliakim / Kevin Amundson (M1 aiv-notes), 8 Sep 2026.  
**Office drafting this SPEC:** Ezra (translation inventory + source honesty). Notes schema ownership remains Baruch.  
**Status:** draft SPEC for Nehemiah to commit. Not a production deploy. Not a finished-translation claim.

---

## 1. Product in one sentence

AIV Notes is a reader that shows **Free Use Bible API** chapter text beside **Kevin’s interpretive notes**. Notes are the Amundson Interpretive Version layer. They are **never** Scripture, **never** BLB, and **never** mixed into a Bible API chapter payload.

---

## 2. Scripture sources (dual-track — do not conflate)

| Track | Id | Where | M1 role |
| --- | --- | --- | --- |
| **API-native** | Any English id from HelloAO catalog (`language=eng`) | `https://bible.helloao.org/` | **M1 chapter source.** Default = **`BSB`**. |
| **Local draft corpus** | `BLB-Draft` | Seed Bible same-origin USX / aivbible (secondary) | **Not in Free Use Bible API.** Remains Seed Bible product default. **Out of M1 aiv-notes chapter fetch.** Dual-source (API + BLB-Draft) is a later milestone. |

### Hard rules

1. **Chapter text for M1 comes only from the Free Use Bible API** (`available_translations.json` + `api/{id}/{BOOK}/{n}.json`).
2. **`defaultTranslationId` for M1 aiv-notes = `BSB`** (Berean Standard Bible). Cite `https://berean.bible/` / API license fields as received.
3. **Do not invent a HelloAO `BLB` id.** Catalog has `BSB`, not `BLB`. `eng_ulb` is Unlocked Literal Bible — not BLB.
4. **Seed Bible product default remains `BLB-Draft`** on `seedbible.kevinamundson.me` / `aiv-seed-bible` develop. That is a different product surface. Changing Seed’s default is out of this SPEC.
5. **Dual-source later:** when Kevin keys it, aiv-notes may offer `BLB-Draft` via adapter (same USX path as Seed). Until then, picker = API English ids only.

### English picker (M1)

- Source register: `/workspace/aiv-translations/english-api-register-2026-09-01.md` (fetched 1 Sep 2026 from `https://bible.helloao.org/api/available_translations.json`; **51** `language=eng` ids).
- At runtime prefer live catalog filter `language === "eng"`; refresh register when catalog moves (Hanani watches).
- Completeness buckets (API-reported): **30** complete (66 books, includes `BSB`); **6** NT-only; **15** other (portions / LXX / Tanakh / etc.). UI may group “complete” vs “all eng” like Seed’s picker modes.
- Always show **translation id** in chrome (e.g. `Genesis 1 / BSB`). Never hide source labels.

### Chapter fetch (M1)

```
GET https://bible.helloao.org/api/available_translations.json
GET https://bible.helloao.org/api/{translationId}/{BOOK}/{chapter}.json
```

- Book codes: USFM 3-letter (`GEN`, `PSA`, `JHN`, …).
- Join keys for notes: `{BOOK}.{chapter}.{verse}` (e.g. `GEN.1.1`) — independent of translation wording (see `schema.json`).
- Record on every chapter view / note cite: **`translationId`**, **`fetchedAt`** (ISO UTC + America/Chicago label when displayed), and API `Last-Modified` / `sha256` when available.

---

## 3. Notes layer (AIV — never Scripture)

### Identity

- Kind: `aiv-note` (see `schema.json` + `example-GEN.1.1.json` in this folder).
- Fixed UI label: **“Kevin's comment (not Scripture)”**.
- Author: Kevin Amundson, role `interpreter`.
- Notes must be visually and structurally distinct from verse text (olive / caption chrome per Bezalel tokens — Nehemiah implements; do not style notes as verse ink).

### Data rules

- Store notes **outside** the chapter JSON from the API. Never inject note bodies into `ChapterVerse.content`.
- Optional `scriptureCite` on a note may copy **id + fetch date + short excerpt** of the verse the note was written beside — not a full chapter dump.
- Status: `draft-for-kevin` | `approved-by-kevin`. Visibility: `private` | `house` | `public`.
- Do **not** label notes as BLB, BSB, or any translation. Do **not** call Kevin’s rendering “BLB.”

### M1 scope for notes

- Ship schema + example + ability to load notes by `verseIds` beside an API chapter.
- Publishing / public feed / AnnotationsManager from Seed: **out of M1** unless Kevin keys separately. Prefer adapter-over-fork; AGPL obligations if Seed code is vendored.

---

## 4. Attribution & honesty (always on screen)

Every reading surface must show:

1. **Translation id** (e.g. `BSB`) and display name from the API.
2. **Fetch / as-of date** for the chapter (or “live API” with last successful fetch timestamp).
3. For notes: the fixed label **Kevin's comment (not Scripture)**.
4. If a note’s `scriptureCite.translationId` differs from the chapter currently displayed, show both (cite vs live) — do not silently rewrite.

Never claim BLB finished. Never claim AIV notes are canonical.

---

## 5. Non-goals (M1)

- Merging Seed Bible into AIV production or flipping Seed’s `BLB-Draft` default.
- Inventing API id `BLB` or serving BLB-Draft as if it were HelloAO-native.
- Altering displayed Scripture wording from the API.
- Shipping notes styled as verse text.
- `git push` to main / production deploy / DNS for `aiv.kevinamundson.me` without Kevin’s yes in-thread.
- Email to `bereanbibles@gmail.com` or HelloAO.

---

## 6. Implementation handoff

| Owner | Deliverable |
| --- | --- |
| **Ezra** | This SPEC; English register; BLB-Draft corpus remains Seed/aivbible (later dual-source). |
| **Nehemiah** | Create repo from this SPEC; wire Free Use Bible API; `defaultTranslationId=BSB`; English picker; keep notes components separate from scripture components; commit `SPEC.md` + existing `schema.json` / example. |
| **Baruch** | Notes data model / identity copy (“Kevin's comment (not Scripture)”); no notes on translation payload. |
| **Bezalel** | Visual distinction: Scripture vs apparatus vs notes (tokens already at `/workspace/aiv-design/distinction.md`). |
| **Hanani** | Pin API catalog + default id after preview; watch HelloAO for BLB id appearance. |
| **Eliakim** | Approval queue; no main/production without Kevin. |

### Stop / ship

- Nehemiah: plan → small branch → preview URL + what to click.
- Stop for Kevin before production deploy or DNS on `aiv.kevinamundson.me`.

---

## 7. References

| Path / URL | Role |
| --- | --- |
| `https://bible.helloao.org/api/available_translations.json` | Live catalog |
| `https://bible.helloao.org/docs` | Free Use Bible API |
| `/workspace/aiv-translations/english-api-register-2026-09-01.md` | Snapshot English register (51 eng) |
| `/workspace/aiv-notes/schema.json` | AIV note schema v1 |
| `/workspace/aiv-notes/example-GEN.1.1.json` | Example note keyed to `GEN.1.1` beside BSB |
| Seed Bible `BLB-Draft` / USX | Separate product; `/workspace/aiv-translations/blb-draft/` |

---

## 8. Acceptance (M1)

- [ ] Chapter loads from Free Use Bible API for `BSB` by default.
- [ ] English picker lists API `eng` ids (register / live catalog); includes `BSB`; no invented `BLB`.
- [ ] Chrome shows translation id + fetch/as-of date.
- [ ] Notes render with label “Kevin's comment (not Scripture)” and never appear inside API chapter JSON.
- [ ] Seed Bible on seedbible host still defaults to `BLB-Draft` (unchanged by this repo).
- [ ] SPEC.md + schema + example committed by Nehemiah; draft only for notes content until Kevin approves.

**Ezra: SPEC draft ready for Nehemiah to commit.** Path: `/workspace/aiv-notes/SPEC.md`.
