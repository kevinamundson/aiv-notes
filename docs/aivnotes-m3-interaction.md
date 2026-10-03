# AIV Notes writer — M3 interaction slip (14 Sep 2026)

**Host:** `aivnotes.kevinamundson.me` (writer UI)  
**Owner:** Bezalel · **Implementer:** Nehemiah  
**Builds on:** `/workspace/aiv-design/aivnotes-writer-tokens.md`, `distinction.md`, `aivnotes-m2-interaction.md` (tokens + range wash still bind; **compose surface changes**)  
**Keyed by:** Kevin (M3 aivnotes UX)  
**Stop:** No live theme swap on production AIV (`aiv.kevinamundson.me`). No new production type family. Olive never-Scripture distinction absolute.

---

## Intent

M3 prioritizes **writing**. Verse select opens a **modal note taker** (not side-sheet-only). Selected Scripture sits at the top as context; the editor stays quiet and minimal. Chapter navigation becomes a proper **chapter/verse selector**.

M2 bottom-sheet-as-primary is **superseded** for compose. Soft olive range wash in the Scripture column remains.

---

## Locked tokens (do not reopen)

| Token | Value |
|---|---|
| Page / parchment | `#F7F4EE` |
| Scripture ink | `#1A1814` (system serif) |
| Note ink | `#3D4A3A` |
| Note rule | `2px solid #6B7F66` |
| Label | Always-visible ASCII: `Kevin's comment (not Scripture)` (U+0027) |

Notes ≠ USX `f` / `x` / `add`. Notes never match Scripture size, weight, or measure.

Baruch data rules still bind: compose bound to `verseId`(s); confirm-before-close on dirty body OK; no partial write; no notes in chapter payloads.

---

## 1. Note taker = modal (not side-sheet-only)

### Trigger

Selecting a verse (or range) in the Scripture column opens the **note modal** for compose/edit.

### Layout

| Viewport | Modal geometry |
|---|---|
| **Wide** (≥ ~768px) | Centered dialog over dimmed Scripture. Max-width ~32–40rem (writing measure). Generous vertical padding; not edge-to-edge. |
| **Narrow** (< ~768px) | Same modal **expands to the sides** — near full-width (small side margins ~8–12px), still a modal (scrim + focus trap), not a left/right docked pane and not a tiny chrome chip. |

### Modal chrome tokens

| Token | Rule |
|---|---|
| Surface | Parchment `#F7F4EE` |
| Edge | Optional top or full border using note rule `#6B7F66` at 1–2px (signals notes voice) |
| Scrim | Dim Scripture behind (~40–55% black or parchment deepen) — readable but clearly secondary |
| Focus | Trap focus in modal; Esc / explicit close; confirm if body dirty |
| Shadow | Soft, craft-quiet — no theatrical glow |

### Hard rules

- **Do not** ship side-sheet-only as the primary compose path on M3.
- Modal must fail the glance test vs Scripture: olive label, sans editor, narrower measure than the verse column.
- Empty state still shows the never-Scripture label + quiet “no note” — not gray fake verses.

---

## 2. Selected verse at top of modal

Top block of the modal (above the never-Scripture label **or** immediately under a one-line chrome title — prefer this order):

1. **Reference** — e.g. `Genesis 1:1` or `Genesis 1:1–2` (system sans, muted olive or ~60% scripture ink; caption/title size, not verse body size)
2. **Selected verse text** — the actual wording of the selection, in **Scripture voice**: system serif, ink `#1A1814`, readable but **smaller than the main chapter column** (context quote, not a second sanctuary). Max ~6–8 lines then scroll inside the quote block.
3. **Never-Scripture label** — ASCII `Kevin's comment (not Scripture)` always visible before the editor
4. **Editor** — note body

### Hard rules

- Verse quote at top is **context**, not editable Scripture. Do not olive the quote; do not put the never-Scripture label on the verse text itself.
- If range spans multiple verses, show continuous excerpt for the range (or first+ellipsis+last if very long) plus the inclusive ref.
- Ref + text must match the bound `verseIds` / `range` (Baruch schema).

---

## 3. Prioritize writing — minimal editor chrome

Hide details that do not help Kevin write. Trim M2 toolbar clutter.

### Keep (minimal set)

| Keep | Why |
|---|---|
| Multiline text field | The point |
| Never-Scripture label | Absolute |
| Selected ref + verse quote | Context |
| Close / save (or implicit save policy per Nehemiah + contract) | Exit path |
| Confirm-before-close when dirty | Chrome OK per Baruch lock |

### Default-visible formatting (trim hard)

Prefer **at most two** always-visible format controls, or a single “Aa / Format” disclosure:

| Preferred minimal | Notes |
|---|---|
| **Bold** + **Italic** only in the primary strip | Enough for most pastoral notes |
| Scripture-ref insert + external link | Move behind “Insert…” or overflow (`⋯`) — not four equal chrome buttons fighting the field |

### Hide or demote

- Status / visibility / schema chrome while composing (unless Kevin explicitly opens “Details”)
- Redundant “Attached: …” if the top verse quote already states the range
- Dense icon rows, secondary metadata, and anything that shrinks the text field below a comfortable writing height (target: field gets **majority** of modal body)

### Type in editor

System sans (or clearly smaller/lighter than Scripture serif); note ink `#3D4A3A`; measure comfortable for prose (~36–45ch inside modal).

---

## 4. Chapter number → chapter/verse selector

The control that today feels like “chapter number only” becomes a **chapter/verse selector** tool in the Scripture chrome (reader toolbar / nav — not inside the note modal).

### Behavior

| Action | Rule |
|---|---|
| Open selector | From current book context (e.g. Genesis) |
| Choose chapter | Updates the chapter column |
| Choose verse | Scrolls/focuses that verse; may optionally pre-select it for note attach |
| Keyboard / list | Clear list or grid of chapters; verses for the chosen chapter — large hit targets on touch |

### Visual

| Token | Rule |
|---|---|
| Control | Caption/chrome — system sans; muted; not Scripture body |
| Active book/chapter | Visible without opening (e.g. `GEN 1` or `Genesis 1`) |
| Panel | Parchment or quiet chrome; no olive body text for verse list items (list is navigation, not notes) |
| Do not | Style the selector as the notes modal; do not use note olive for canonical listing ink |

### Hard rules

- Selector changes **location in Scripture**; it does not edit note body by itself.
- Opening a verse from the selector may select that verse (and thus can open the note modal if that remains the product rule — Nehemiah: one clear behavior, prefer select-then-optional-compose or select-opens-modal consistently with M3 §1).

---

## Relationship to M2

| M2 item | M3 disposition |
|---|---|
| Bottom sheet ≥45–60% as primary compose | **Superseded** by centered / near-full-width **modal** |
| Soft olive range wash | **Keep** |
| Four-button equal toolbar | **Trim** — bold/italic primary; ref/link demoted |
| Label + tokens | **Keep** |
| Confirm-before-close | **Keep** |

Keep `aivnotes-m2-interaction.md` for history; **implement M3 from this file**.

---

## What this slip is not

- Not a live AIV theme swap or new production type family
- Not permission to merge notes into USX / API chapter JSON
- Not a finished-translation claim
- Not Seed Bible fork chrome by default

---

## Handoff

Nehemiah: implement on aivnotes writer only. Cite this file + M1 tokens + NOTES-CONTRACT. Preview: wide centered modal; narrow near-full-width modal; verse quote + ref on top; minimal editor; chapter/verse selector. @Bezalel paints after green if Eliakim asks. Draft only.
