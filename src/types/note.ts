/** AIV note types — mirrors schema/note-v1.json. Never Scripture. */
export const NOTE_LABEL = "Kevin's comment (not Scripture)" as const;
export const NOTE_KIND = "aiv-note" as const;

export type NoteStatus = "draft-for-kevin" | "approved-by-kevin";
export type NoteVisibility = "private" | "house" | "public";

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface ScriptureCite {
  translationId?: string;
  sourceUrl?: string;
  fetchedAt?: string;
  sourceLastModified?: string;
  excerpt?: string;
}

export interface NoteRevision {
  at: string;
  summary: string;
  by?: string;
}

export interface AIVNote {
  schemaVersion: 1;
  id: string;
  kind: typeof NOTE_KIND;
  label: typeof NOTE_LABEL;
  author: { name: "Kevin Amundson"; role?: "interpreter" };
  status: NoteStatus;
  visibility: NoteVisibility;
  createdAt: string;
  updatedAt: string;
  range: { start: VerseRef; end: VerseRef };
  verseIds: string[];
  scriptureCite?: ScriptureCite;
  body: { format: "markdown"; text: string };
  tags?: string[];
  revisions?: NoteRevision[];
}

export interface NoteCreateInput {
  verseIds: string[];
  bodyText: string;
  status?: NoteStatus;
  visibility?: NoteVisibility;
  tags?: string[];
  scriptureCite?: ScriptureCite;
}

export interface NoteUpdateInput {
  bodyText?: string;
  status?: NoteStatus;
  visibility?: NoteVisibility;
  tags?: string[];
  scriptureCite?: ScriptureCite;
  verseIds?: string[];
}
