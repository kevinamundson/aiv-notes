# aiv-notes

AIV Notes writer. Notes are never Scripture. Default translation BSB.

## Storage
FsNoteStore by default (data/aiv-notes/). BlobNoteStore when BLOB_READ_WRITE_TOKEN is set.

## Setup
1. Clone, checkout develop
2. Copy .env.example to .env.local
3. Install dependencies and run the Next.js dev script from package.json
4. Open http://localhost:3000 -> /BSB/GEN/1

## OAuth
Callback: {AUTH_URL}/api/auth/callback/github
Env: AUTH_SECRET AUTH_URL GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET WRITER_ALLOWLIST BLOB_READ_WRITE_TOKEN

## Vercel
Deploy from develop. Domain aivnotes.kevinamundson.me CNAME to cname.vercel-dns.com
Do not touch aiv.kevinamundson.me or Seed Bible.

## Tokens
Page #F7F4EE; Scripture #1A1814 serif 66ch; Notes #3D4A3A rule #6B7F66 sans 36ch


## M1 features

- Next.js App Router + TypeScript + Tailwind
- Auth.js (NextAuth v5) GitHub provider; WRITER_ALLOWLIST (default kevinamundson)
- Chapters readable without sign-in; note writes require allowlisted session
- Route `/[translation]/[book]/[chapter]` default BSB/GEN/1
- Apparatus shows translation id, source URL, fetchedAt
- Notes labeled exactly: Kevin's comment (not Scripture)
- Verse tap opens editor; Dictate via Web Speech API
- public visibility requires approved-by-kevin
- Stub: GET /api/c/aiv-notes/?verseId= → 501

## Docs

- docs/SPEC.md, docs/NOTES-CONTRACT.md, docs/aivnotes-writer-tokens.md, docs/helloao-commentary-stub.md
- schema/note-v1.json, schema/example-GEN.1.1.json
