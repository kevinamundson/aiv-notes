import {
  DEFAULT_TRANSLATION_ID,
  HELLOAO_API_BASE,
} from "@/lib/constants";
import type { ChapterPayload, ChapterView } from "@/types/scripture";

function flattenVerseContent(
  content: Array<string | Record<string, unknown>>,
): string {
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      parts.push(item);
    } else if (item && typeof item === "object" && "text" in item) {
      parts.push(String(item.text));
    }
    // skip noteId / lineBreak markers from API apparatus
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function chapterSourceUrl(
  translationId: string,
  book: string,
  chapter: number,
): string {
  return `${HELLOAO_API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(book)}/${chapter}.json`;
}

export async function fetchChapter(
  translationId: string = DEFAULT_TRANSLATION_ID,
  book: string = "GEN",
  chapter: number = 1,
): Promise<ChapterView> {
  const sourceUrl = chapterSourceUrl(translationId, book, chapter);
  const fetchedAt = new Date().toISOString();
  const res = await fetch(sourceUrl, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`HelloAO chapter fetch failed: ${res.status} ${sourceUrl}`);
  }
  const sourceLastModified = res.headers.get("last-modified");
  const data = (await res.json()) as ChapterPayload;

  const verses: ChapterView["verses"] = [];
  const headings: ChapterView["headings"] = [];
  let pendingHeading: string | null = null;

  for (const item of data.chapter.content ?? []) {
    if (item.type === "heading") {
      const text = Array.isArray(item.content)
        ? item.content.filter((x): x is string => typeof x === "string").join(" ")
        : "";
      pendingHeading = text;
    } else if (item.type === "verse" && typeof item.number === "number") {
      if (pendingHeading) {
        headings.push({ beforeVerse: item.number, text: pendingHeading });
        pendingHeading = null;
      }
      const text = flattenVerseContent(
        (item.content ?? []) as Array<string | Record<string, unknown>>,
      );
      verses.push({
        number: item.number,
        text,
        verseId: `${book}.${chapter}.${item.number}`,
      });
    }
  }

  return {
    translationId: data.translation?.id ?? translationId,
    bookId: data.book?.id ?? book,
    chapter: data.chapter?.number ?? chapter,
    translationName: data.translation?.name ?? translationId,
    bookName: data.book?.commonName ?? data.book?.name ?? book,
    sourceUrl,
    fetchedAt,
    sourceLastModified,
    verses,
    headings,
  };
}

export async function listEnglishTranslations(): Promise<
  Array<{ id: string; name: string; complete?: boolean }>
> {
  const url = `${HELLOAO_API_BASE}/available_translations.json`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [{ id: DEFAULT_TRANSLATION_ID, name: "Berean Standard Bible" }];
  const data = (await res.json()) as {
    translations?: Array<{
      id: string;
      name?: string;
      englishName?: string;
      language?: string;
      numberOfBooks?: number;
    }>;
  };
  const list = data.translations ?? (data as unknown as Array<Record<string, unknown>>);
  const arr = Array.isArray(list) ? list : [];
  return arr
    .filter((t) => (t as { language?: string }).language === "eng")
    .map((t) => {
      const row = t as {
        id: string;
        name?: string;
        englishName?: string;
        numberOfBooks?: number;
      };
      return {
        id: row.id,
        name: row.name ?? row.englishName ?? row.id,
        complete: row.numberOfBooks === 66,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
