# AIV Notes writer — M4 mobile modal slip (14 Sep 2026)

**Host:** `aivnotes.kevinamundson.me` (writer UI, **narrow / keyboard-first**)  
**Owner:** Bezalel · **Implementer:** Nehemiah  
**Builds on:** M1 tokens, M3 modal interaction (`aivnotes-m3-interaction.md`)  
**Keyed by:** Kevin (M4 mobile note UX — match reference mock aesthetic)  
**Stop:** No live theme swap on production AIV (`aiv.kevinamundson.me`). No new production type family. Notes never look like Scripture.

---

## Intent

On **narrow screens**, the note compose surface matches Kevin’s mock:

- Dark / semi-transparent modal over Scripture  
- Header: **passage ref only** + close **X** — minimal  
- Large empty field: placeholder **“Type note here…”**  
- Three actions: **Delete** / **Cancel** / **Save**  
- Keyboard-first; hide extra chrome (no heavy toolbar, no status clutter while composing)  
- Selected verse context via **ref in header**; if verse text is shown, keep it minimal  

**Wide screens** may keep the M3 centered parchment modal if it still feels writing-first. **Prioritize mobile** to this mock.

**Reference raster (Kevin):** `/workspace/aiv-design/m4-ref/kevin-m4-mobile-modal.png`  
(1 Timothy 1:16 ESV compose — match this simple/clean aesthetic.)

### Pin from the screenshot

| Element | Mock observation | M4 rule |
|---|---|---|
| Overlay | Dark charcoal, ~80–90% opacity; Scripture faintly visible behind | Semi-transparent dark modal, not opaque black box |
| Header left | Circled note mark + `1 Timothy 1:16 ESV` (white sans) | Passage **ref** (+ translation id if shown); optional small note glyph; system sans |
| Header right | Circular **X** | Close control; ≥44px hit |
| Field | Large rounded rect, thin light border; placeholder `Type note here...`; caret focused | Same; no toolbar inside field |
| Actions | Equal row: **Delete** · **Cancel** · **Save** — dark fill, thin light border, white label, rounded | Three peer ghost buttons; Save still the clearest CTA by position/weight if needed |
| Keyboard | System keyboard up; modal sits above it | Keyboard-first; do not bury field under chrome |
| Scripture behind | Serif on cream; selected verse light-**blue** wash; small circled `1` on the verse | Selection wash may match mock **light blue** on mobile; note glyph on verse OK. Never-Scripture label is **not** in the mock — add as quiet caption under ref (required) |
| Absent in mock | Toolbar, status, verse body dump in modal | Keep absent |

---

## Locked (do not drop)

| Rule | Value |
|---|---|
| Never-Scripture label | ASCII `Kevin's comment (not Scripture)` (U+0027) — **must remain visible** on mobile (see § Label) |
| Notes ≠ Scripture | Notes ≠ USX `f` / `x` / `add`; never merge into chapter payloads |
| Range / verseIds | Baruch contract still binds |
| Confirm-before-close | OK when body dirty (Cancel / X / scrim) |

M1 parchment/olive tokens remain the **wide / light** language. M4 adds a **mobile dark compose** skin without calling the note body “Scripture.”

---

## 1. Mobile modal shell (match mock)

### Geometry

| Token | Rule |
|---|---|
| Coverage | Near full-bleed over Scripture (small safe margins OK); still a **modal** (scrim + focus trap), not a side sheet |
| Height | Majority of viewport; field gets most of the modal — keyboard-first |
| Scrim | Scripture visible but dimmed behind the dark panel |

### Surface (mobile dark)

| Token | Value / rule |
|---|---|
| Modal fill | Dark charcoal, semi-transparent — match mock ~80–90% opacity (e.g. `rgba(28, 26, 23, 0.85)`–`0.92`); Scripture faintly readable behind |
| Text on modal | Light ink for chrome/field — e.g. `#EDE8DF` / `#F7F4EE` at high contrast |
| Accent / focus | Quiet; optional olive `#6B7F66` or `#B7C4B0` for focus ring / label only — **not** for dyeing verse quotes as notes body |
| Corners | Soft radius OK; no theatrical glow |

Do **not** use Seed oxblood/gold as the mobile compose skin unless Kevin keys it later.

---

## 2. Header (minimal)

Order, top → down:

1. **Passage ref** — e.g. `1 Timothy 1:16` or `Genesis 1:1–2`  
   - Single line; system sans; light muted ink  
   - **Ref only** in the primary header row (match mock)
2. **Close X** — trailing; large hit target (≥44px); dismisses (confirm if dirty)
3. **Never-Scripture caption** — see § Label (under ref, quiet)
4. Optional **minimal verse excerpt** — only if needed for context; one short block, smaller than chapter Scripture, light muted; **not** editable; omit if it crowds the field

### Hard rules

- No status badges, visibility, schema fields, or dense metadata in the header while composing.
- No four-button M2 toolbar in the header.

---

## 3. Never-Scripture label (required on dark mobile)

Kevin’s mock is chrome-light; the label must still **fail a glance test**.

**Placement (preferred):** caption **directly under the passage ref**, before the text field — one quiet line:

`Kevin's comment (not Scripture)`

| Token | Rule |
|---|---|
| Size | Caption (~0.75–0.85rem) |
| Ink | Olive-family on dark: `#B7C4B0` or `#6B7F66` at readable contrast — **not** the same weight/size as the note body |
| Always | Visible in empty + compose + edit; never hide to gain pixels |

If vertical space is extreme with keyboard open, keep at least this caption + ~3 lines of the field visible when feasible (same spirit as M2/M3).

---

## 4. Editor field

| Token | Rule |
|---|---|
| Placeholder | Exactly or clearly: `Type note here…` |
| Field | Large, empty-first; majority of modal body |
| Type | System sans; light ink on dark fill; comfortable prose size |
| Measure | Full width of modal content inset |
| Formatting chrome | **Hidden by default** on mobile M4 — no heavy Bold/Italic/Ref/Link strip while composing. (Optional: long-press or a single discreet `Aa` only if Nehemiah needs markdown escapes; default is plain write.) |

Writing > chrome. Keyboard open must not bury the field under toolbars.

---

## 5. Actions: Delete / Cancel / Save

Three actions only in the primary footer (or sticky above keyboard):

| Action | Role | Visual |
|---|---|---|
| **Delete** | Destroy this note (confirm) | Danger-quiet; not primary filled |
| **Cancel** | Dismiss without save (confirm if dirty) | Secondary / ghost |
| **Save** | Persist per Baruch contract | Primary — clearest CTA |

| Token | Rule |
|---|---|
| Hit targets | ≥44px tall on touch |
| Order | Prefer `Delete` leading (or trailing danger), `Cancel` middle, `Save` trailing primary — match platform norms if they conflict; **Save** must remain obvious |
| No extras | No “Details”, status, visibility toggles in this row |

---

## 6. Wide screens (secondary)

| Rule | Disposition |
|---|---|
| Priority | Mobile mock first |
| Wide | May keep M3 **centered parchment** modal (ref + optional verse quote + label + minimal editor + close) if writing-first |
| Do not | Force the dark semi-transparent skin onto wide if parchment still reads clearer for long notes — unless Kevin later keys one skin everywhere |

Chapter/verse selector (M3 §4) stays in **reader chrome**, not inside this compose modal.

---

## 7. Relationship to M2 / M3

| Prior | M4 mobile |
|---|---|
| M2 bottom sheet | Still superseded; M4 is dark **modal** |
| M3 centered parchment / near-full-width | Mobile skin → **dark semi-transparent** per mock; wide may keep parchment |
| M3 verse text at top | Mobile: **ref in header**; verse text optional/minimal |
| M3 Bold/Italic primary strip | Mobile: **hide** while composing |
| Olive never-Scripture | **Keep** as quiet caption under ref |
| Soft olive range wash in Scripture column | **Keep** |

Implement from **this file** for narrow compose. M3 remains the wide baseline unless unified later.

---

## What this slip is not

- Not permission to drop the never-Scripture label  
- Not a live AIV theme swap or new production type family  
- Not Seed Bible chrome copy-paste  
- Not a finished-translation claim  

---

## Handoff

Nehemiah: narrow-first on aivnotes. Cite this file + M1/M3 + NOTES-CONTRACT. Preview: phone width → dark modal, ref + X, label caption, `Type note here…`, Delete/Cancel/Save, keyboard. Wide: parchment modal OK. @Bezalel paints when Eliakim asks. Draft only.

**Note:** Slip written from Eliakim’s keyed mock description (e.g. 1 Timothy 1:16). If a raster mock is later dropped in `/workspace/aiv-design/`, align spacing/radius to that image without reopening the never-Scripture rule.
