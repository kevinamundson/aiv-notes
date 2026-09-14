import { promises as fs } from "fs";
import path from "path";
import {
  AIVBIBLE_USX_BASE,
  BLB_DRAFT_BADGE,
  BLB_DRAFT_ID,
  BLB_DRAFT_NAME,
  DEFAULT_TRANSLATION_ID,
  HELLOAO_API_BASE,
} from "@/lib/constants";

/** Local ingest truth (same draft corpus — not BSB). Server-only. */
const BLB_DRAFT_LOCAL_USX_DIR =
  process.env.BLB_DRAFT_USX_DIR ||
  "/workspace/aiv-translations/blb-draft/usx";
const BLB_DRAFT_LOCAL_MANIFEST =
  process.env.BLB_DRAFT_MANIFEST ||
  "/workspace/aiv-translations/blb-draft/manifest.json";
import {
  convertUsxChapter,
  runsFromVerseContent,
  type UsxManifest,
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
  if (translationId === BLB_DRAFT_ID) {
    return `${AIVBIBLE_USX_BASE}/${encodeURIComponent(book)}.usx`;
  }
  return `${HELLOAO_API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(book)}/${chapter}.json`;
}

async function loadManifest(): Promise<UsxManifest> {
  const remoteUrl = `${AIVBIBLE_USX_BASE}/manifest.json`;
  try {
    const res = await fetch(remoteUrl, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) return (await res.json()) as UsxManifest;
  } catch {
    // fall through to local
  }
  try {
    const raw = await fs.readFile(BLB_DRAFT_LOCAL_MANIFEST, "utf8");
    return JSON.parse(raw) as UsxManifest;
  } catch {
    return {
      id: BLB_DRAFT_ID,
      displayName: BLB_DRAFT_NAME,
      status: "draft",
    };
  }
}

async function loadUsxXml(book: string): Promise<{ xml: string; sourceUrl: string }> {
  const remoteUrl = `${AIVBIBLE_USX_BASE}/${encodeURIComponent(book)}.usx`;
  const errors: string[] = [];

  try {
    const res = await fetch(remoteUrl, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    if (res.ok) {
      const xml = await res.text();
      if (xml.includes("<usx") || xml.includes("<USX")) {
        return { xml, sourceUrl: remoteUrl };
      }
      errors.push(`${remoteUrl}: response was not USX`);
    } else {
      errors.push(`${remoteUrl}: HTTP ${res.status}`);
    }
  } catch (e) {
    errors.push(
      `${remoteUrl}: ${e instanceof Error ? e.message : "fetch failed"}`,
    );
  }

  // Same BLB-Draft corpus only — never silent BSB swap.
  const localPath = path.join(BLB_DRAFT_LOCAL_USX_DIR, `${book}.usx`);
  try {
    const xml = await fs.readFile(localPath, "utf8");
    return { xml, sourceUrl: `file://${localPath}` };
  } catch (e) {
    errors.push(
      `${localPath}: ${e instanceof Error ? e.message : "read failed"}`,
    );
  }

  throw new Error(
    `BLB-Draft USX unavailable for ${book}. Tried preferred aivbible host and local draft corpus (not BSB). ${errors.join(" | ")}`,
  );
}

async function fetchBlbDraftChapter(
  book: string,
  chapter: number,
): Promise<ChapterView> {
  const fetchedAt = new Date().toISOString();
  const manifest = await loadManifest();
  const { xml, sourceUrl } = await loadUsxXml(book);
  const converted = convertUsxChapter(xml, book, chapter, manifest);

  const verses: ChapterView["verses"] = [];
  const headings: ChapterView["headings"] = [];
  let pendingHeading: string | null = null;

  for (const item of converted.content) {
    if (item.type === "heading") {
      pendingHeading = item.content.join(" ");
    } else if (item.type === "verse") {
      if (pendingHeading) {
        headings.push({ beforeVerse: item.number, text: pendingHeading });
        pendingHeading = null;
      }
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
      `BLB-Draft USX for ${book} chapter ${chapter} parsed zero verses (source: ${sourceUrl})`,
    );
  }

  return {
    translationId: BLB_DRAFT_ID,
    bookId: book,
    chapter,
    translationName: converted.translationName || BLB_DRAFT_NAME,
    bookName: converted.bookName,
    sourceUrl,
    fetchedAt,
    sourceLastModified: null,
    draft: true,
    draftBadge: BLB_DRAFT_BADGE,
    manifestFetchedAtUtc: converted.manifestFetchedAtUtc ?? manifest.fetchedAtUtc ?? null,
    verses,
    headings,
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
  // Never call HelloAO for BLB / BLB-Draft — that id is not in the catalog.
  if (translationId === BLB_DRAFT_ID) {
    return fetchBlbDraftChapter(book, chapter);
  }
  if (translationId === "BLB") {
    throw new Error(
      "HelloAO has no BLB id. Use BLB-Draft (local USX) or another English catalog id (e.g. BSB).",
    );
  }
  return fetchHelloAoChapter(translationId, book, chapter);
}

export async function listEnglishTranslations(): Promise<
  Array<{ id: string; name: string; complete?: boolean; draft?: boolean }>
> {
  const blbDraft = {
    id: BLB_DRAFT_ID,
    name: BLB_DRAFT_NAME,
    complete: true,
    draft: true,
  };

  try {
    const url = `${HELLOAO_API_BASE}/available_translations.json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [blbDraft];
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
      // Exact case from catalog; never invent BLB.
      .filter((t) => t.id !== "BLB" && t.id !== BLB_DRAFT_ID)
      .sort((a, b) => a.id.localeCompare(b.id));

    return [blbDraft, ...eng];
  } catch {
    return [blbDraft];
  }
}
