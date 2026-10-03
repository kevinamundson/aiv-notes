import { assertPublicPolicy, NOTE_LABEL } from "@/lib/constants";
import {
  expandVerseIdsFromRange,
  normalizeRange,
  parseVerseId,
} from "@/lib/notes/range";
import type { AIVNote, NoteCreateInput, NoteUpdateInput, VerseRef } from "@/types/note";
import { NOTE_KIND } from "@/types/note";

const ID_RE = /^aiv-note-[a-z0-9-]+$/;

export { parseVerseId, expandVerseIdsFromRange, normalizeRange };

export function newNoteId(verseId: string): string {
  const slug = verseId.toLowerCase().replace(/\./g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `aiv-note-${slug}-${rand}`;
}

function resolveRange(input: {
  range?: { start: VerseRef; end: VerseRef };
  verseIds?: string[];
}): { start: VerseRef; end: VerseRef } {
  if (input.range?.start && input.range?.end) {
    return normalizeRange(input.range);
  }
  if (input.verseIds?.length) {
    const start = parseVerseId(input.verseIds[0]);
    const end = parseVerseId(input.verseIds[input.verseIds.length - 1]);
    return normalizeRange({ start, end });
  }
  throw new Error("range or verseIds required");
}

export function buildNoteFromCreate(input: NoteCreateInput): AIVNote {
  if (!input.bodyText?.trim()) throw new Error("body text required");
  const range = resolveRange(input);
  // Baruch M2: always recompute verseIds from inclusive same-chapter range.
  const verseIds = expandVerseIdsFromRange(range);
  const status = input.status ?? "draft-for-kevin";
  const visibility = input.visibility ?? "private";
  assertPublicPolicy(status, visibility);

  const now = new Date().toISOString();
  const id = newNoteId(verseIds[0]);
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
    range,
    verseIds,
    scriptureCite: input.scriptureCite,
    body: { format: "markdown", text: input.bodyText.trim() },
    tags: input.tags,
    revisions: [
      {
        at: now,
        summary: "Created via AIV Notes writer M2",
        by: "Kevin Amundson",
      },
    ],
  };
}

export function applyNoteUpdate(existing: AIVNote, input: NoteUpdateInput): AIVNote {
  const status = input.status ?? existing.status;
  const visibility = input.visibility ?? existing.visibility;
  assertPublicPolicy(status, visibility);

  const range =
    input.range?.start && input.range?.end
      ? normalizeRange(input.range)
      : input.verseIds?.length
        ? normalizeRange({
            start: parseVerseId(input.verseIds[0]),
            end: parseVerseId(input.verseIds[input.verseIds.length - 1]),
          })
        : existing.range;

  const verseIds = expandVerseIdsFromRange(range);
  const now = new Date().toISOString();
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
    verseIds,
    range,
    body: { format: "markdown", text: bodyText },
    tags: input.tags ?? existing.tags,
    scriptureCite: input.scriptureCite ?? existing.scriptureCite,
    revisions: [
      ...(existing.revisions ?? []),
      { at: now, summary: "Updated via AIV Notes writer M2", by: "Kevin Amundson" },
    ],
  };
}

export function assertNoteShape(note: AIVNote): void {
  if (note.schemaVersion !== 1) throw new Error("schemaVersion must be 1");
  if (note.kind !== NOTE_KIND) throw new Error("kind must be aiv-note");
  if (note.label !== NOTE_LABEL) throw new Error("label must be fixed never-Scripture string");
  if (!ID_RE.test(note.id)) throw new Error("invalid note id");
  if (note.body.format !== "markdown") {
    throw new Error("M2 stores markdown only (body.format must be markdown)");
  }
  if (!note.body.text?.trim()) throw new Error("body.text required");
  const expected = expandVerseIdsFromRange(note.range);
  if (
    expected.length !== note.verseIds.length ||
    expected.some((id, i) => id !== note.verseIds[i])
  ) {
    throw new Error("verseIds must equal inclusive expansion of range");
  }
  assertPublicPolicy(note.status, note.visibility);
}
