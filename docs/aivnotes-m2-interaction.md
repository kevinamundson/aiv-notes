# AIV Notes writer — M2 token / interaction slip (14 Sep 2026)

**Host:** `aivnotes.kevinamundson.me` (writer UI)  
**Owner:** Bezalel · **Implementer:** Nehemiah  
**Builds on:** `/workspace/aiv-design/aivnotes-writer-tokens.md` + `/workspace/aiv-design/distinction.md`  
**Keyed by:** Kevin (M2 aivnotes UI)  
**Stop:** No live theme swap on production AIV (`aiv.kevinamundson.me`). No new production type family without Kevin’s key. Olive never-Scripture distinction stays absolute.

---

## Intent

M1 locked the two voices (Scripture sanctuary vs olive notes). M2 adds **craft affordances** only — toolbar, mobile sheet, verse-range select — without letting chrome or the note surface look like Scripture.

---

## Locked from M1 (do not reopen)

| Token | Value |
|---|---|
| Page / parchment | `#F7F4EE` |
| Scripture ink | `#1A1814` (system serif, ~66ch) |
| Note ink | `#3D4A3A` |
| Note rule | `2px solid #6B7F66` |
| Label | Always-visible ASCII: `Kevin's comment (not Scripture)` (U+0027) |

Notes ≠ USX `f` / `x` / `add`. Notes never share Scripture size, weight, or measure.

---

## 1. Rich note toolbar

Lives **inside the notes surface only** — never over the Scripture column, never in the verse line.

### Controls (M2 set)

| Control | Behavior | Visual |
|---|---|---|
| **Bold** | Markdown `**…**` or equivalent; toggles selection | Icon or `B` glyph; note-chrome, not Scripture serif |
| **Italic** | Markdown `*…*` or equivalent | Icon or `I` glyph; same chrome voice |
| **Scripture-ref insert** | Inserts a cite token (e.g. `GEN.1.1` / display “Genesis 1:1”) into the note body — **excerpt cite only**, never pastes chapter text as if canonical | Distinct control; opens verse picker or uses current selection range |
| **External link** | Markdown `[label](https://…)` or equivalent; https only | Link icon; confirm URL field in note chrome |

### Toolbar tokens

| Token | Rule |
|---|---|
| Placement | Top of the note editor, **below** the never-Scripture label |
| Height | Comfortable hit target ≥44px on touch; desktop can be tighter (~32–36px) |
| Ink / icons | Muted olive family — use note ink `#3D4A3A` at ~70–85% for idle; full `#3D4A3A` or rule `#6B7F66` for active/hover |
| Background | Same parchment as page, or 1-step quieter (e.g. `#F0EBE3`); never Scripture-column fill that matches verse paper so closely it merges |
| Separator | Optional 1px `#6B7F66` at ~40% opacity under toolbar — not a second “Scripture rule” |
| Type in toolbar | System sans, caption size — never Scripture serif |

### Hard rules

- Toolbar chrome must fail the glance test with Scripture: smaller, sans, olive-muted.
- Bold/italic change **note body** only. Do not restyle the Scripture column from these controls.
- Scripture-ref insert is a **citation inside the note**, not a merge into USX or API chapter JSON.
- External links stay in the note body; never auto-rewrite verse text.

---

## 2. Mobile: note box on verse select

When the reader selects a verse (or verse range) on a narrow viewport, the note surface must appear as a **real on-screen textbox / sheet** — not a tiny chrome chip, floating glyph, or cramped footer button.

### Behavior

| State | Rule |
|---|---|
| Trigger | Verse (or range) selected in Scripture column |
| Appearance | Bottom sheet or large inline panel covering a clear majority of the lower viewport (target ≥45–60% height, or full width with generous padding) |
| Contents | Never-Scripture label → toolbar → multiline text field (keyboard-ready) |
| Dismiss | Explicit close / swipe-down / tap-outside per platform norms; do not lose draft without confirm if text changed |
| Empty | Label + quiet “no note” / placeholder in note ink — not gray fake verses |

### Mobile sheet tokens

| Token | Rule |
|---|---|
| Sheet background | `#F7F4EE` (parchment) |
| Top edge | `2px solid #6B7F66` (same note rule — signals “notes voice”) |
| Body type | System sans / smaller than Scripture; note ink `#3D4A3A` |
| Text field | Large enough for thumbs; min ~4–6 lines visible before scroll |
| Scripture behind | Dim or remain readable but clearly secondary; do not restyle verses to olive |

### Hard rules

- Reject “tiny chrome” patterns: icon-only FAB without sheet, 1-line input in the nav bar, or note UI smaller than a readable paragraph.
- Label `Kevin's comment (not Scripture)` remains visible while editing — do not hide it to gain pixels.
- Keyboard open must keep label + at least ~3 lines of the field visible when feasible.

---

## 3. Verse-range selection (Scripture column)

Affordance lives in the **Scripture column** so Kevin can attach a note to one verse or a contiguous range.

### Behavior

| Action | Rule |
|---|---|
| Tap verse number or verse body | Selects that verse; shows range endpoints |
| Extend range | Drag, shift-tap, or long-press → contiguous verses only (same chapter for M2 unless later keyed) |
| Visual | Selection highlight on parchment — see tokens below |
| Outcome | Selected `verseIds` feed the note’s `range` / `verseIds` (Baruch schema); sheet/pane opens for note |

### Selection tokens

| Token | Value / rule |
|---|---|
| Selection fill | Soft wash: olive at low alpha on parchment — e.g. `#6B7F66` at ~12–18% opacity — **or** a cool parchment deepen (`#E8E2D6`). Prefer olive wash so “this range is for a note” reads without dyeing verse ink olive |
| Selection edge | Optional 1px `#6B7F66` at ~50% on the block edge |
| Verse numbers | Stay visible and muted; selected number may strengthen to ~80% of scripture ink, never olive for the numeral itself |
| Active endpoint | Slightly stronger wash on start/end verses so range bounds are obvious |
| Multi-verse | One continuous highlight block, not per-glyph glitter |

### Hard rules

- Selection chrome is **affordance**, not a third textual voice. Verse glyphs stay Scripture ink `#1A1814`.
- Do not use oxblood/gold (Seed chrome) for verse selection on this host unless Kevin keys it.
- Do not italicize or olive the canonical wording to mean “selected.”
- Range must map cleanly to schema `verseIds` / `range.start`–`range.end` — no silent gaps.

---

## Contrast & craft checks

- Note toolbar icons and sheet text: aim WCAG AA against parchment `#F7F4EE` for note ink `#3D4A3A` (body/UI).
- Selection wash must keep verse text readable (contrast of `#1A1814` on wash+parchment still clear).
- No pagan motifs; chrome recedes. Lampstand / scroll / wall / plain rule only if any craft mark appears.

---

## What this slip is not

- Not a rewrite of M1 color tokens.
- Not permission to put the toolbar over Scripture or style notes as serif body matching the verse column.
- Not Seed Bible fork UI patterns by default.
- Not a live deploy or `main` push.

---

## Handoff

Nehemiah: implement on aivnotes writer only. Cite this file + M1 tokens + `NOTES-CONTRACT.md`. Preview URL + what to tap (desktop toolbar; mobile verse → sheet; range select). @Baruch paint never-Scripture label + schema `verseIds` after green. Draft only until Kevin keys further.
