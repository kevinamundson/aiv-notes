/** Free Use Bible API chapter shapes (bible.helloao.org). Notes never appear here. */
export interface TranslationMeta {
  id: string;
  name: string;
  englishName?: string;
  language?: string;
  website?: string;
  licenseUrl?: string;
  sha256?: string;
  numberOfBooks?: number;
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
  };
}

export interface ChapterView {
  translationId: string;
  bookId: string;
  chapter: number;
  translationName: string;
  bookName: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceLastModified: string | null;
  verses: Array<{ number: number; text: string; verseId: string }>;
  headings: Array<{ beforeVerse: number; text: string }>;
}
