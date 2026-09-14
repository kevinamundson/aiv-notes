/** Scripture chapter shapes. Notes never appear here. */

export interface TranslationMeta {
  id: string;
  name: string;
  englishName?: string;
  language?: string;
  website?: string;
  licenseUrl?: string;
  sha256?: string;
  numberOfBooks?: number;
  draft?: boolean;
}

export interface BookMeta {
  id: string;
  translationId: string;
  name: string;
  commonName?: string;
  numberOfChapters: number;
  sha256?: string;
}

export type ChapterContentItem =
  | { type: "heading"; content: string[] }
  | { type: "verse"; number: number; content: Array<string | Record<string, unknown>> }
  | { type: "line_break" }
  | { type: string; [key: string]: unknown };

export interface ChapterPayload {
  translation: TranslationMeta;
  book: BookMeta;
  chapter: {
    number: number;
    content: ChapterContentItem[];
    footnotes?: Array<{ noteId: string; text: string; caller?: string }>;
  };
}

/** Inline Scripture run — translator `add` renders italic; never AIV notes. */
export type VerseRun = {
  text: string;
  add?: boolean;
  wordsOfJesus?: boolean;
};

export interface ChapterView {
  translationId: string;
  bookId: string;
  chapter: number;
  translationName: string;
  bookName: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceLastModified: string | null;
  draft?: boolean;
  draftBadge?: string;
  manifestFetchedAtUtc?: string | null;
  verses: Array<{
    number: number;
    text: string;
    verseId: string;
    runs: VerseRun[];
  }>;
  headings: Array<{ beforeVerse: number; text: string }>;
  /** Apparatus only (USX f/x) — not AIV notes. */
  footnotes?: Array<{ noteId: string; text: string; caller?: string; kind?: string }>;
}
