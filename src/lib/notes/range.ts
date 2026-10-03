import type { VerseRef } from "@/types/note";

const VERSE_RE = /^[A-Z0-9]{3}\.\d+\.\d+$/;

export function parseVerseId(verseId: string): VerseRef {
  if (!VERSE_RE.test(verseId)) throw new Error(`Invalid verseId: ${verseId}`);
  const [book, ch, v] = verseId.split(".");
  return { book, chapter: Number(ch), verse: Number(v) };
}

export function toVerseId(ref: VerseRef): string {
  return `${ref.book}.${ref.chapter}.${ref.verse}`;
}

/**
 * Inclusive same-chapter expansion (Baruch M2).
 * Recomputes verseIds from range — do not trust a client list.
 */
export function expandVerseIdsFromRange(range: {
  start: VerseRef;
  end: VerseRef;
}): string[] {
  const { start, end } = range;
  if (!start?.book || !end?.book) throw new Error("range.start/end required");
  if (start.book !== end.book) {
    throw new Error("M2 ranges must be same book (cross-book deferred)");
  }
  if (start.chapter !== end.chapter) {
    throw new Error("M2 ranges must be same chapter (cross-chapter deferred)");
  }
  if (start.verse < 1 || end.verse < 1) throw new Error("verse must be >= 1");
  const lo = Math.min(start.verse, end.verse);
  const hi = Math.max(start.verse, end.verse);
  const book = start.book.toUpperCase();
  const chapter = start.chapter;
  const ids: string[] = [];
  for (let v = lo; v <= hi; v++) {
    ids.push(`${book}.${chapter}.${v}`);
  }
  return ids;
}

/** Normalize range so start.verse <= end.verse. */
export function normalizeRange(range: {
  start: VerseRef;
  end: VerseRef;
}): { start: VerseRef; end: VerseRef } {
  const ids = expandVerseIdsFromRange(range);
  return {
    start: parseVerseId(ids[0]),
    end: parseVerseId(ids[ids.length - 1]),
  };
}
