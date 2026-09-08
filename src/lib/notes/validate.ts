import { assertPublicPolicy, NOTE_LABEL } from "@/lib/constants";
import type { AIVNote, NoteCreateInput, NoteUpdateInput } from "@/types/note";
import { NOTE_KIND } from "@/types/note";

const ID_RE = /^aiv-note-[a-z0-9-]+$/;
const VERSE_RE = /^[A-Z0-9]{3}\.\d+\.\d+$/;

export function parseVerseId(verseId: string): {
  book: string;
  chapter: number;
  verse: number;
} {
  const m = VERSE_RE.exec(verseId);
  if (!m) throw new Error(`Invalid verseId: ${verseId}`);
  const [book, ch, v] = verseId.split(".");
  return { book, chapter: Number(ch), verse: Number(v) };
}

export function newNoteId(verseId: string): string {
  const slug = verseId.toLowerCase().replace(/\./g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `aiv-note-${slug}-${rand}`;
}

export function buildNoteFromCreate(input: NoteCreateInput): AIVNote {
  if (!input.verseIds?.length) throw new Error("verseIds required");
  if (!input.bodyText?.trim()) throw new Error("body text required");
  for (const id of input.verseIds) {
    if (!VERSE_RE.test(id)) throw new Error(`Invalid verseId: ${id}`);
  }
  const status = input.status ?? "draft-for-kevin";
  const visibility = input.visibility ?? "private";
  assertPublicPolicy(status, visibility);

  const start = parseVerseId(input.verseIds[0]);
  const end = parseVerseId(input.verseIds[input.verseIds.length - 1]);
  const now = new Date().toISOString();
  const id = newNoteId(input.verseIds[0]);
  if (!ID_RE.test(id)) throw new Error("generated id invalid");

  return {
    schemaVersion: 1,
    id,
    kind: NOTE_KIND,
    label: NOTE_LABEL,
    author: { name: "Kevin Amundson", role: "interpreter" },
    status,
    visibility,
    createdAt: now,
    updatedAt: now,
    range: { start, end },
    verseIds: [...new Set(input.verseIds)],
    scriptureCite: input.scriptureCite,
    body: { format: "markdown", text: input.bodyText.trim() },
    tags: input.tags,
    revisions: [
      {
        at: now,
        summary: "Created via AIV Notes writer M1",
        by: "Kevin Amundson",
      },
    ],
  };
}

export function applyNoteUpdate(existing: AIVNote, input: NoteUpdateInput): AIVNote {
  const status = input.status ?? existing.status;
  const visibility = input.visibility ?? existing.visibility;
  assertPublicPolicy(status, visibility);
  const verseIds = input.verseIds ?? existing.verseIds;
  if (!verseIds.length) throw new Error("verseIds required");
  for (const id of verseIds) {
    if (!VERSE_RE.test(id)) throw new Error(`Invalid verseId: ${id}`);
  }
  const now = new Date().toISOString();
  const start = parseVerseId(verseIds[0]);
  const end = parseVerseId(verseIds[verseIds.length - 1]);
  const bodyText = input.bodyText?.trim() ?? existing.body.text;
  if (!bodyText) throw new Error("body text required");

  return {
    ...existing,
    label: NOTE_LABEL,
    kind: NOTE_KIND,
    author: { name: "Kevin Amundson", role: "interpreter" },
    status,
    visibility,
    updatedAt: now,
    verseIds: [...new Set(verseIds)],
    range: { start, end },
    body: { format: "markdown", text: bodyText },
    tags: input.tags ?? existing.tags,
    scriptureCite: input.scriptureCite ?? existing.scriptureCite,
    revisions: [
      ...(existing.revisions ?? []),
      { at: now, summary: "Updated via AIV Notes writer M1", by: "Kevin Amundson" },
    ],
  };
}

export function assertNoteShape(note: AIVNote): void {
  if (note.schemaVersion !== 1) throw new Error("schemaVersion must be 1");
  if (note.kind !== NOTE_KIND) throw new Error("kind must be aiv-note");
  if (note.label !== NOTE_LABEL) throw new Error("label must be fixed never-Scripture string");
  if (!ID_RE.test(note.id)) throw new Error("invalid note id");
  assertPublicPolicy(note.status, note.visibility);
}
