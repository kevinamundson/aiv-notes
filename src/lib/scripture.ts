import {
  AIV_BADGE,
  AIV_ID,
  AIV_NAME,
  AIV_REVALIDATE_SECONDS,
  AIVBIBLE_METADATA_URL,
  AIVBIBLE_USX_BASE,
  DEFAULT_TRANSLATION_ID,
  HELLOAO_API_BASE,
  LEGACY_DRAFT_ID,
  normalizeTranslationId,
} from "@/lib/constants";
import { getCanonBook } from "@/lib/canon";
import {
  convertUsxChapter,
  runsFromVerseContent,
  type AivMetadata,
} from "@/lib/usx-to-chapter";
import type { ChapterPayload, ChapterView, VerseRun } from "@/types/scripture";

function flattenVerseContent(
  content: Array<string | Record<string, unknown>>,
): { text: string; runs: VerseRun[] } {
  const runs: VerseRun[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      if (item) runs.push({ text: item });
    } else if (item && typeof item === "object" && "text" in item) {
      const run: VerseRun = { text: String(item.text) };
      if (item.add === true) run.add = true;
      if (item.wordsOfJesus === true) run.wordsOfJesus = true;
      runs.push(run);
    }
    // skip noteId / lineBreak — apparatus, not AIV notes
  }
  const text = runs
    .map((r) => r.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return { text, runs };
}

export function chapterSourceUrl(
  translationId: string,
  book: string,
  chapter: number,
): string {
  if (normalizeTranslationId(translationId) === AIV_ID) {
    return `${AIVBIBLE_USX_BASE}/${encodeURIComponent(book)}.usx`;
  }
  return `${HELLOAO_API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(book)}/${chapter}.json`;
}

/** AIV display name from aivbible metadata.json; constant if unreachable. */
async function loadAivName(): Promise<string> {
  try {
    const res = await fetch(AIVBIBLE_METADATA_URL, {
      next: { revalidate: AIV_REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const meta = (await res.json()) as AivMetadata;
      const name = meta.name?.trim();
      if (name && meta.shortName) return `${name} (${meta.shortName.trim()})`;
      if (name) return name;
    }
  } catch {
    // fall through
  }
  return AIV_NAME;
}

/** Live AIV USX from aivbible. No bundled copy, no fallback text. */
async function loadUsxXml(book: string): Promise<{ xml: string; sourceUrl: string }> {
  const url = `${AIVBIBLE_USX_BASE}/${encodeURIComponent(book)}.usx`;
  let detail: string;
  try {
    const res = await fetch(url, {
      next: { revalidate: AIV_REVALIDATE_SECONDS },
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    if (res.ok) {
      const xml = await res.text();
      if (xml.includes("<usx") || xml.includes("<USX")) {
        return { xml, sourceUrl: url };
      }
      detail = "response was not USX";
    } else {
      detail = `HTTP ${res.status}`;
    }
  } catch (e) {
    detail = e instanceof Error ? e.message : "fetch failed";
  }
  throw new Error(`Chapter unavailable: AIV text for ${book} could not be loaded from ${url} (${detail}).`);
}

async function fetchAivChapter(
  book: string,
  chapter: number,
): Promise<ChapterView> {
  const fetchedAt = new Date().toISOString();
  const [translationName, { xml, sourceUrl }] = await Promise.all([
    loadAivName(),
    loadUsxXml(book),
  ]);
  const converted = convertUsxChapter(xml, book, chapter);

  const verses: ChapterView["verses"] = [];
  const headings: ChapterView["headings"] = [];
  let pending: ChapterView["headings"] = [];

  for (const item of converted.content) {
    if (item.type === "heading") {
      pending.push({ beforeVerse: 0, text: item.content.join(" "), kind: item.kind });
    } else if (item.type === "verse") {
      for (const h of pending) headings.push({ ...h, beforeVerse: item.number });
      pending = [];
      const { text, runs } = runsFromVerseContent(item.content);
      verses.push({
        number: item.number,
        text,
        verseId: `${book}.${chapter}.${item.number}`,
        runs,
      });
    }
  }

  if (!verses.length) {
    throw new Error(
      `Chapter unavailable: AIV ${book} ${chapter} parsed zero verses (source: ${sourceUrl})`,
    );
  }

  return {
    translationId: AIV_ID,
    bookId: book,
    chapter,
    translationName,
    // Same chapter-heading names as before ("Psalm 3"); USX h/toc as fallback.
    bookName: getCanonBook(book)?.name ?? converted.bookName,
    sourceUrl,
    fetchedAt,
    sourceLastModified: null,
    draft: true,
    draftBadge: AIV_BADGE,
    verses,
    headings,
    // `d` after the last verse (Psalm postscripts, HAB 3:19).
    postscripts: pending
      .filter((h) => h.kind === "subtitle")
      .map((h) => ({ text: h.text })),
    footnotes: converted.footnotes,
  };
}

async function fetchHelloAoChapter(
  translationId: string,
  book: string,
  chapter: number,
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
      const { text, runs } = flattenVerseContent(
        (item.content ?? []) as Array<string | Record<string, unknown>>,
      );
      verses.push({
        number: item.number,
        text,
        verseId: `${book}.${chapter}.${item.number}`,
        runs,
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
    draft: false,
    verses,
    headings,
  };
}

export async function fetchChapter(
  translationId: string = DEFAULT_TRANSLATION_ID,
  book: string = "GEN",
  chapter: number = 1,
): Promise<ChapterView> {
  // AIV is read from aivbible only; the retired draft id maps to it.
  if (normalizeTranslationId(translationId) === AIV_ID) {
    return fetchAivChapter(book, chapter);
  }
  return fetchHelloAoChapter(translationId, book, chapter);
}

export async function listEnglishTranslations(): Promise<
  Array<{ id: string; name: string; complete?: boolean; draft?: boolean }>
> {
  const aiv = {
    id: AIV_ID,
    name: await loadAivName(),
    complete: true,
    draft: true,
  };

  try {
    const url = `${HELLOAO_API_BASE}/available_translations.json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [aiv];
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
    const eng = arr
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
          draft: false,
        };
      })
      // Exact case from catalog; AIV is listed once, from aivbible.
      .filter((t) => t.id !== AIV_ID && t.id !== LEGACY_DRAFT_ID)
      .sort((a, b) => a.id.localeCompare(b.id));

    return [aiv, ...eng];
  } catch {
    return [aiv];
  }
}

// Chapter/verse navigation counts for the selector: see src/lib/canon.ts (client-safe; not Scripture wording).
