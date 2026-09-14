# AIV Notes — M2 product SPEC

**Repo (Nehemiah lands):** `aiv-notes` — not merge into Seed Bible AGPL tree without Kevin's key.  
**Domain (intended later):** notes live beside Scripture on AIV surfaces; M2 may ship as repo + preview first.  
**Keyed:** Eliakim / Kevin Amundson — M1 (8 Sep 2026), **M2 dual-source + BLB-Draft default (14 Sep 2026)**.  
**Office drafting this SPEC:** Ezra (translation inventory + source honesty). Notes schema ownership remains Baruch.  
**Status:** draft SPEC for Nehemiah to commit. Not a production deploy. Not a finished-translation claim.

**Changelog:** M1 defaulted chapter text to Free Use Bible API `BSB` only. **M2** flips aiv-notes `defaultTranslationId` to **`BLB-Draft`** (local USX host), keeps all HelloAO English ids selectable, and brings dual-source into scope. M1 acceptance for BSB-as-default is superseded for aiv-notes; Seed Bible product default was already `BLB-Draft` and is unchanged by this SPEC.

---

## 1. Product in one sentence

AIV Notes is a reader that shows **Scripture chapter text** (dual-source: `BLB-Draft` USX + Free Use Bible API English ids) beside **Kevin's interpretive notes**. Notes are the Amundson Interpretive Version layer. They are **never** Scripture, **never** BLB, and **never** mixed into a Bible chapter payload.

---

## 2. Scripture sources (dual-source — in scope for M2)

| Track | Id | Where | M2 role |
| --- | --- | --- | --- |
| **Local draft corpus** | `BLB-Draft` | `https://aivbible.kevinamundson.me/usx/{BOOK}.usx` (+ `manifest.json`) | **`defaultTranslationId`.** Not in Free Use Bible API. Show **DRAFT** badge. Cite fetch date + manifest fields. |
| **API-native** | Any English id from HelloAO catalog (`language=eng`, case-sensitive) | `https://bible.helloao.org/` | **Selectable** in picker. Not default. Includes `BSB`. |

### Hard rules

1. **`defaultTranslationId` for M2 aiv-notes = `BLB-Draft`.** Display name: Berean Literal Bible (Draft). Always show a **DRAFT** badge. Never claim finished.
2. **Primary chapter fetch for default:** `GET https://aivbible.kevinamundson.me/usx/{BOOK}.usx` (USFM 3-letter book code). Pair with host/local `manifest.json` for attribution (`fetchedAtUtc`, source URLs, `status: draft`, license note).
3. **Do not invent a HelloAO `BLB` id.** Catalog has `BSB`, not `BLB`. `eng_ulb` is Unlocked Literal Bible — not BLB. Never call HelloAO for `api/BLB/...` or `api/BLB-Draft/...`.
4. **Dual-source is in scope:** picker offers `BLB-Draft` **and** exact Free Use Bible API English ids. Switching away from default loads API chapters; switching back uses the USX adapter path.
5. **Seed Bible** on `seedbible.kevinamundson.me` / `aiv-seed-bible` develop already defaults to `BLB-Draft`. This SPEC does not change Seed. Prefer shared adapter patterns (`usx_to_seed_chapter` / Seed `BlbDraftAdapter`) over inventing a second converter.
6. **Fallback:** if aivbible USX is unreachable, document failure honestly (no silent swap to BSB). Optional same-origin or local corpus path is Nehemiah's engineering choice; ingest truth remains `/workspace/aiv-translations/blb-draft/usx/`.

### English picker (M2)

- Always include **`BLB-Draft`** (first / default) with DRAFT badge.
- Plus API English ids from register `/workspace/aiv-translations/english-api-register-2026-09-01.md` (fetched 1 Sep 2026; **51** `language=eng` ids) or live `available_translations.json` filtered `language === "eng"`.
- **Case-sensitive API ids** (e.g. `eng_wmu`, not `ENG_WMU`). Prefer live catalog at runtime; refresh register when catalog moves (Hanani watches).
- Completeness buckets (API-reported): **30** complete (66 books, includes `BSB`); **6** NT-only; **15** other. UI may group "complete" vs "all eng".
- Always show **translation id** in chrome (e.g. `Genesis 1 / BLB-Draft` or `Genesis 1 / BSB`). Never hide source labels.

### Chapter fetch

**Default (`BLB-Draft`):**

```
GET https://aivbible.kevinamundson.me/usx/{BOOK}.usx
GET https://aivbible.kevinamundson.me/usx/manifest.json   # or bundled manifest from corpus
```

- Convert USX chapter slice → reader chapter JSON (reuse Seed adapter map: `add` → italic, `wj`, `f`/`x` apparatus — **not** AIV notes).
- Fixtures / converter: `/workspace/aiv-translations/blb-draft/usx_to_seed_chapter.py`, `seed-chapter-fixtures/`, `ADAPTER-FOR-SEED-BIBLE.md`.
- Record: **`translationId=BLB-Draft`**, **`fetchedAt`** (ISO UTC + America/Chicago when displayed), manifest `fetchedAtUtc` / source sha when available, **DRAFT** status.

**Selectable API ids:**

```
GET https://bible.helloao.org/api/available_translations.json
GET https://bible.helloao.org/api/{translationId}/{BOOK}/{chapter}.json
```

- Book codes: USFM 3-letter (`GEN`, `PSA`, `JHN`, …).
- Join keys for notes: `{BOOK}.{chapter}.{verse}` (e.g. `GEN.1.1`) — independent of translation wording (see `schema.json`).
- Record: **`translationId`**, **`fetchedAt`**, API `Last-Modified` / `sha256` when available.

---

## 3. Notes layer (AIV — never Scripture)

### Identity

- Kind: `aiv-note` (see `schema.json` + `example-GEN.1.1.json` in this folder).
- Fixed UI label: **Kevin's comment (not Scripture)** (ASCII apostrophe U+0027 — matches Baruch schema).
- Author: Kevin Amundson, role `interpreter`.
- Notes must be visually and structurally distinct from verse text (olive / caption chrome per Bezalel tokens — Nehemiah implements; do not style notes as verse ink).

### Data rules

- Store notes **outside** the chapter JSON (API or BLB-Draft adapter). Never inject note bodies into verse content.
- USX `f` / `x` are **translation apparatus**, not AIV notes. Keep them on the Scripture track.
- Optional `scriptureCite` on a note may copy **id + fetch date + short excerpt** of the verse the note was written beside — not a full chapter dump.
- Status: `draft-for-kevin` | `approved-by-kevin`. Visibility: `private` | `house` | `public`.
- Do **not** label notes as BLB, BLB-Draft, BSB, or any translation. Do **not** call Kevin's rendering "BLB."

### M2 scope for notes

- Ship schema + example + ability to load notes by `verseIds` beside the active chapter (default BLB-Draft or selected API id).
- Publishing / public feed / AnnotationsManager from Seed: **out of M2** unless Kevin keys separately. Prefer adapter-over-fork; AGPL obligations if Seed code is vendored.

---

## 4. Attribution & honesty (always on screen)

Every reading surface must show:

1. **Translation id** and display name (`BLB-Draft` / Berean Literal Bible (Draft), or API name for selectable ids).
2. **DRAFT badge** whenever `BLB-Draft` is active.
3. **Fetch / as-of date** for the chapter: for BLB-Draft, prefer manifest `fetchedAtUtc` + chapter fetch time; for API, last successful fetch.
4. For notes: the fixed label **Kevin's comment (not Scripture)**.
5. If a note's `scriptureCite.translationId` differs from the chapter currently displayed, show both (cite vs live) — do not silently rewrite.

Never claim BLB finished. Never claim AIV notes are canonical. Never present `BLB-Draft` as a HelloAO catalog id.

---

## 5. Non-goals (M2)

- Inventing API id `BLB` or serving BLB-Draft as if it were HelloAO-native.
- Declaring BLB finished or removing the DRAFT badge.
- Altering displayed Scripture wording (USX or API) in the reader.
- Shipping notes styled as verse text, or conflating AIV notes with USX `f`/`x`.
- Merging Seed Bible into AIV production or changing Seed's defaults via this repo.
- `git push` to main / production deploy / DNS for `aiv.kevinamundson.me` without Kevin's yes in-thread.
- Email to `bereanbibles@gmail.com` or HelloAO.

---

## 6. Implementation handoff

| Owner | Deliverable |
| --- | --- |
| **Ezra** | This SPEC (M2); English register (case-exact); BLB-Draft USX corpus + converter fixtures. |
| **Nehemiah** | Commit SPEC; wire dual-source; `defaultTranslationId=BLB-Draft` from aivbible USX; DRAFT badge + manifest cite; English picker (API ids case-sensitive); keep notes components separate from scripture components. |
| **Baruch** | Notes data model / identity copy ("Kevin's comment (not Scripture)"); no notes on translation payload. |
| **Bezalel** | Visual distinction: Scripture vs apparatus vs notes (tokens at `/workspace/aiv-design/distinction.md`). |
| **Hanani** | Pin aivbible USX + API catalog after preview; watch HelloAO for any real BLB id (do not invent). |
| **Eliakim** | Approval queue; no main/production without Kevin. |

### Stop / ship

- Nehemiah: plan → small branch → preview URL + what to click (default BLB-Draft GEN 1; switch to BSB; note label visible).
- Stop for Kevin before production deploy or DNS on `aiv.kevinamundson.me`.

---

## 7. References

| Path / URL | Role |
| --- | --- |
| `https://aivbible.kevinamundson.me/usx/{BOOK}.usx` | M2 default chapter source (BLB-Draft) |
| `/workspace/aiv-translations/blb-draft/manifest.json` | Draft attribution / fetch metadata |
| `/workspace/aiv-translations/blb-draft/ADAPTER-FOR-SEED-BIBLE.md` | Adapter map + wiring notes |
| `/workspace/aiv-translations/blb-draft/usx_to_seed_chapter.py` | USX → chapter JSON converter |
| `https://bible.helloao.org/api/available_translations.json` | Live API catalog |
| `https://bible.helloao.org/docs` | Free Use Bible API |
| `/workspace/aiv-translations/english-api-register-2026-09-01.md` | Snapshot English register (51 eng) |
| `/workspace/aiv-notes/schema.json` | AIV note schema v1 |
| `/workspace/aiv-notes/example-GEN.1.1.json` | Example note keyed to `GEN.1.1` |
| Seed Bible `BLB-Draft` / USX | Separate product surface; shared corpus patterns |

---

## 8. Acceptance (M2)

- [ ] Chapter loads from `https://aivbible.kevinamundson.me/usx/{BOOK}.usx` for **`BLB-Draft` by default**.
- [ ] **DRAFT** badge + manifest/fetch cite on screen when BLB-Draft is active.
- [ ] English picker lists API `eng` ids (exact case) **and** `BLB-Draft`; includes `BSB`; **no invented HelloAO `BLB`**.
- [ ] Selecting an API id loads Free Use Bible API chapters; selecting BLB-Draft uses USX adapter path.
- [ ] Chrome shows translation id + fetch/as-of date for whichever source is active.
- [ ] Notes render with label "Kevin's comment (not Scripture)" and never appear inside chapter JSON (API or adapter).
- [ ] USX `f`/`x` stay apparatus, not AIV notes.
- [ ] Seed Bible on seedbible host still defaults to `BLB-Draft` (unchanged by this repo).
- [ ] SPEC.md + schema + example committed by Nehemiah; draft only for notes content until Kevin approves.

**Ezra: M2 SPEC draft ready for Nehemiah to commit.** Path: `/workspace/aiv-notes/SPEC.md`.
