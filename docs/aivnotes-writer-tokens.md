# AIV Notes writer — token slip (8 Sep 2026)

**Host:** `aivnotes.kevinamundson.me` (M1 writer UI)  
**Owner:** Bezalel · **Implementer:** Nehemiah  
**Source:** `/workspace/aiv-design/distinction.md` (reuse; do not invent parallel tokens)  
**Stop:** No live theme swap on production AIV (`aiv.kevinamundson.me`). No new production type family without Kevin’s key.

---

## Intent

Two voices only on this surface: **Scripture** (sanctuary) and **Kevin’s notes** (never canonical). Chrome recedes. Notes must fail a glance test — if you squint, they are still not the text.

---

## Page

| Token | Value | Rule |
|---|---|---|
| Page / parchment | `#F7F4EE` | Off-white, parchment-adjacent. Matches first-slice page. |
| Dark page (if dark mode) | `#1C1A17` | Optional; same distinction.md dark. |

Do not use Seed Bible oxblood/gold chrome tokens here unless Kevin later keys writer chrome. Scripture and notes stay on parchment paper.

---

## Scripture column

| Token | Value | Rule |
|---|---|---|
| Ink | `#1A1814` | Near-black on paper. Never oxblood, gold, or olive. |
| Dark ink | `#EDE8DF` | Dark mode only. |
| Type | System serif: `Iowan Old Style`, `Palatino`, `Georgia`, serif | Largest body. No webfont until Kevin keys a family. |
| Measure | max ~66ch | Generous reading measure. |
| Verse numbers | tabular, ~0.75em, muted (~60% of scripture ink) | Always visible. Never omit. |
| Canonical wording | upright serif | Never italic *for* canonical wording. (Translator `add` italics, if shown, stay Scripture voice — same size/ink, true italic — not notes.) |

---

## Kevin’s notes (AIV commentary)

| Token | Value | Rule |
|---|---|---|
| Note ink | `#3D4A3A` | Olive. Not scripture black. |
| Note ink (dark) | `#B7C4B0` | Dark mode only. |
| Note rule / edge | `2px solid #6B7F66` | Left edge rule or side-column separator. |
| Type | System sans (or same serif at clearly smaller size + lighter weight) | Must not match Scripture size, weight, or measure. |
| Measure | max ~36ch | Narrower than Scripture. |
| Required label | Always-visible: `Kevin's comment (not Scripture)` | Every note block starts with this line. Empty pane: same label + quiet “no note” — not gray fake verses. |

Hard rules from distinction.md still bind: do not match note type size/weight/measure to the verse column; notes are never mistaken for Scripture at a glance.

---

## What this slip is not

- Not a Seed Bible Customize Colors sheet (oxblood `#840000` / gold `#9A7B2F` stay on seedbible `develop` unless separately keyed).
- Not BLB apparatus styling (`f`/`x` captions). Those are translation apparatus, not the AIV notes pane.
- Not permission to ship typefaces, replace live AIV theme, or push `main`.

---

## Handoff

Nehemiah: apply these tokens on the M1 aiv-notes writer UI only. Cite this file + `distinction.md` in the PR/plan. Preview URL + what to click when ready for paint. Draft only until Kevin keys further.
