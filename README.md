# aiv-notes

AIV Notes writer. Notes are never Scripture. **Default translation: `eng_aiv`** (Amundson Interpretive Version (AIV), draft, read live from aivbible USX). Selectable English ids from Free Use Bible API (HelloAO).

## Storage
Local next dev: FsNoteStore (data/aiv-notes/) unless a Blob token is set. On Vercel: always BlobNoteStore (private by default); never FS.

## Setup
1. Clone, checkout develop
2. Copy .env.example to .env.local
3. `bun install` && `bun run dev`
4. Open http://localhost:3000 → `/eng_aiv/GEN/1`

## OAuth
Callback: {AUTH_URL}/api/auth/callback/github
Env: AUTH_SECRET AUTH_URL GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET WRITER_ALLOWLIST BLOB_READ_WRITE_TOKEN


## Vercel
Deploy from **develop**. Domain aivnotes.kevinamundson.me CNAME to cname.vercel-dns.com.
Do not touch aiv.kevinamundson.me or Seed Bible. Do not merge main without Kevin.

## Tokens (Bezalel)
Page #F7F4EE; Scripture #1A1814 serif 66ch; Notes #3D4A3A rule #6B7F66 sans 36ch.
M2: toolbar below never-Scripture label; mobile bottom sheet; olive range wash.

## M2 features
- Dual-source: `eng_aiv` live from `https://aivbible.kevinamundson.me/usx/{BOOK}.usx` (name from `metadata.json`, refetched at most every 60 s; no bundled copy); HelloAO for other eng ids (exact case)
- DRAFT badge always for AIV; display name Amundson Interpretive Version (AIV), short name AIV
- The retired id `BLB-Draft` redirects to `eng_aiv` in URLs, and saved notes that cite it read as `eng_aiv`
- USX markers: `s1`/`qa` headings, `r` refs, `d` superscriptions and chapter-end postscripts (a `d` holding a verse stays a verse), `cls` colophons; a verse ends at its `eid`
- Honest "Chapter unavailable" error if aivbible fails (no fallback text)
- USX `add` → italic; `f`/`x` apparatus not AIV notes
- Markdown note body (`**bold**`, `*italic*`, `[[GEN.1.1]]`, `[label](https://…)`) — no TipTap
- Verse range: inclusive same-chapter; server recomputes `verseIds` from `range` on save
- Mobile: verse tap → bottom sheet composer; desktop side pane
- Web Speech dictate; Blob store on Vercel; Auth allowlist unchanged

## Docs
- docs/SPEC.md (Ezra M2), docs/NOTES-CONTRACT.md (Baruch M2), docs/aivnotes-writer-tokens.md, docs/aivnotes-m2-interaction.md
- schema/note-v1.json, schema/example-GEN.1.1.json, schema/example-GEN.1.1-3.json
