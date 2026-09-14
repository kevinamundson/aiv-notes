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
import {
  convertUsxChapter,
  runsFromVerseContent,
  type UsxManifest,
} from "@/lib/usx-to-chapter";
import type { ChapterPayload, ChapterView, VerseRun } from "@/types/scripture";

/** Bundled same-origin draft corpus (committed under public/). Never BSB. */
const BUNDLED_USX_DIR = path.join(
  process.cwd(),
  "public",
  "blb-draft",
  "usx",
);
const BUNDLED_MANIFEST = path.join(BUNDLED_USX_DIR, "manifest.json");
const PUBLIC_USX_PATH = "/blb-draft/usx";

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

/** Origin for same-origin static asset fetch (AUTH_URL / VERCEL_URL). */
function sameOriginBase(): string | null {
  const auth = process.env.AUTH_URL?.replace(/\/$/, "");
  if (auth) return auth;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }
  return null;
}

async function tryFetchUsx(
  url: string,
  errors: string[],
): Promise<{ xml: string; sourceUrl: string } | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    if (res.ok) {
      const xml = await res.text();
      if (xml.includes("<usx") || xml.includes("<USX")) {
        return { xml, sourceUrl: url };
      }
      errors.push(`${url}: response was not USX`);
    } else {
      errors.push(`${url}: HTTP ${res.status}`);
    }
  } catch (e) {
    errors.push(`${url}: ${e instanceof Error ? e.message : "fetch failed"}`);
  }
  return null;
}

async function tryReadUsxFile(
  filePath: string,
  errors: string[],
): Promise<{ xml: string; sourceUrl: string } | null> {
  try {
    const xml = await fs.readFile(filePath, "utf8");
    if (xml.includes("<usx") || xml.includes("<USX")) {
      return { xml, sourceUrl: `file://${filePath}` };
    }
    errors.push(`${filePath}: file was not USX`);
  } catch (e) {
    errors.push(
      `${filePath}: ${e instanceof Error ? e.message : "read failed"}`,
    );
  }
  return null;
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
    // fall through
  }

  // Bundled public/ asset (same-origin corpus)
  try {
    const raw = await fs.readFile(BUNDLED_MANIFEST, "utf8");
    return JSON.parse(raw) as UsxManifest;
  } catch {
    // fall through
  }

  const origin = sameOriginBase();
  if (origin) {
    try {
      const res = await fetch(`${origin}${PUBLIC_USX_PATH}/manifest.json`, {
        next: { revalidate: 3600 },
        headers: { Accept: "application/json" },
      });
      if (res.ok) return (await res.json()) as UsxManifest;
    } catch {
      // fall through
    }
  }

  // Optional env override only (never hardcoded /workspace)
  const envManifest = process.env.BLB_DRAFT_MANIFEST;
  if (envManifest) {
    try {
      const raw = await fs.readFile(envManifest, "utf8");
      return JSON.parse(raw) as UsxManifest;
    } catch {
      // fall through
    }
  }

  return {
    id: BLB_DRAFT_ID,
    displayName: BLB_DRAFT_NAME,
    status: "draft",
  };
}

async function loadUsxXml(book: string): Promise<{ xml: string; sourceUrl: string }> {
  const remoteUrl = `${AIVBIBLE_USX_BASE}/${encodeURIComponent(book)}.usx`;
  const errors: string[] = [];

  // (a) Preferred aivbible remote host
  const remote = await tryFetchUsx(remoteUrl, errors);
  if (remote) return remote;

  // (b) Same-origin bundled corpus under public/blb-draft/usx
  const bundledPath = path.join(BUNDLED_USX_DIR, `${book}.usx`);
  const bundled = await tryReadUsxFile(bundledPath, errors);
  if (bundled) return bundled;

  const origin = sameOriginBase();
  if (origin) {
    const sameOriginUrl = `${origin}${PUBLIC_USX_PATH}/${encodeURIComponent(book)}.usx`;
    const viaFetch = await tryFetchUsx(sameOriginUrl, errors);
    if (viaFetch) return viaFetch;
  }

  // (c) Optional env override — only when explicitly set (no /workspace default)
  const envDir = process.env.BLB_DRAFT_USX_DIR;
  if (envDir) {
    const envPath = path.join(envDir, `${book}.usx`);
    const fromEnv = await tryReadUsxFile(envPath, errors);
    if (fromEnv) return fromEnv;
  }

  throw new Error(
    `BLB-Draft USX unavailable for ${book}. Tried preferred aivbible host, same-origin draft corpus under ${PUBLIC_USX_PATH}, and BLB_DRAFT_USX_DIR if set (not BSB). ${errors.join(" | ")}`,
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

// Chapter/verse navigation counts for the selector: see src/lib/canon.ts (client-safe; not Scripture wording).
