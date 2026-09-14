/**
 * BLB-Draft USX → reader chapter JSON.
 * Port of /workspace/aiv-translations/blb-draft/usx_to_seed_chapter.py (Ezra).
 * Marker map: char@add → italic; note@f/x → apparatus (not AIV notes).
 * Does not invent HelloAO BLB id. Does not vendor Seed Bible AGPL.
 */

export type UsxManifest = {
  fetchedAtUtc?: string;
  fetchedAtAmericaChicago?: string;
  sourceUrl?: string;
  sourcePage?: string;
  status?: string;
  displayName?: string;
  id?: string;
  stats?: { verses?: number };
  books?: Array<{ usfm: string; nameAsReceived?: string; chapters?: number }>;
};

export type FormattedRun = {
  text: string;
  add?: boolean;
  wordsOfJesus?: boolean;
};

export type UsxChapterResult = {
  translationId: "BLB-Draft";
  translationName: string;
  bookId: string;
  bookName: string;
  chapter: number;
  content: Array<
    | { type: "heading"; content: string[] }
    | {
        type: "verse";
        number: number;
        content: Array<string | FormattedRun | { noteId: string }>;
      }
  >;
  footnotes: Array<{
    noteId: string;
    text: string;
    caller: string;
    kind: "footnote" | "crossReference";
  }>;
  manifestFetchedAtUtc?: string;
};

function collectPlain(xml: string): string {
  return xml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
}

function findChapterSlice(usxXml: string, chapterNum: number): string {
  const chapterAny = /<chapter\b[^>]*\/?>/gi;
  const opens = [...usxXml.matchAll(chapterAny)];
  let startIdx = -1;
  let endIdx = usxXml.length;
  for (let i = 0; i < opens.length; i++) {
    const m = opens[i];
    const tag = m[0];
    const isTarget =
      new RegExp(`\\bnumber="${chapterNum}"`, "i").test(tag) &&
      !/\beid\s*=/.test(tag);
    if (!isTarget) continue;
    startIdx = (m.index ?? 0) + tag.length;
    if (i + 1 < opens.length) {
      endIdx = opens[i + 1].index ?? usxXml.length;
    }
    break;
  }
  if (startIdx < 0) {
    throw new Error(`USX chapter ${chapterNum} not found`);
  }
  return usxXml.slice(startIdx, endIdx);
}

/** Minimal element walk over a USX document string for one chapter. */
export function convertUsxChapter(
  usxXml: string,
  book: string,
  chapterNum: number,
  manifest: UsxManifest = {},
): UsxChapterResult {
  const content: UsxChapterResult["content"] = [];
  const footnotes: UsxChapterResult["footnotes"] = [];
  let noteCounter = 1;
  let currentVerse: number | null = null;
  let verseContent: Array<string | FormattedRun | { noteId: string }> = [];

  const flushVerse = () => {
    if (currentVerse !== null) {
      const merged: typeof verseContent = [];
      for (const item of verseContent) {
        if (
          typeof item === "string" &&
          merged.length &&
          typeof merged[merged.length - 1] === "string"
        ) {
          merged[merged.length - 1] = (merged[merged.length - 1] as string) + item;
        } else {
          merged.push(item);
        }
      }
      content.push({ type: "verse", number: currentVerse, content: merged });
    }
    currentVerse = null;
    verseContent = [];
  };

  const addText = (s: string | undefined | null) => {
    if (s && currentVerse !== null) verseContent.push(s);
  };

  const slice = findChapterSlice(usxXml, chapterNum);
  const paraRe = /<para\b([^>]*)>([\s\S]*?)<\/para>/gi;
  let paraMatch: RegExpExecArray | null;

  const walk = (html: string) => {
    const tokenRe =
      /<verse\b([^>]*)\s*\/?>|<char\b([^>]*)>([\s\S]*?)<\/char>|<note\b([^>]*)>([\s\S]*?)<\/note>/gi;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(html)) !== null) {
      if (m.index > last) addText(html.slice(last, m.index));
      if (m[0].startsWith("<verse")) {
        const vAttrs = m[1] ?? "";
        if (/\beid\s*=/.test(vAttrs)) {
          last = m.index + m[0].length;
          continue;
        }
        const numMatch = /\bnumber="(\d+)"/i.exec(vAttrs);
        flushVerse();
        currentVerse = numMatch ? Number(numMatch[1]) : null;
        verseContent = [];
      } else if (m[0].startsWith("<char")) {
        const cAttrs = m[2] ?? "";
        const body = m[3] ?? "";
        const cStyle = /\bstyle="([^"]*)"/i.exec(cAttrs)?.[1];
        const text = collectPlain(body);
        const fmt: FormattedRun = { text };
        if (cStyle === "add") fmt.add = true;
        if (cStyle === "wj") fmt.wordsOfJesus = true;
        if (currentVerse !== null) verseContent.push(fmt);
      } else if (m[0].startsWith("<note")) {
        const nAttrs = m[4] ?? "";
        const body = m[5] ?? "";
        const nStyle = /\bstyle="([^"]*)"/i.exec(nAttrs)?.[1];
        const caller = /\bcaller="([^"]*)"/i.exec(nAttrs)?.[1] ?? "+";
        const text = collectPlain(body).trim();
        const nid = `note-${noteCounter++}`;
        footnotes.push({
          noteId: nid,
          text,
          caller,
          kind: nStyle === "f" ? "footnote" : "crossReference",
        });
        if (currentVerse !== null) verseContent.push({ noteId: nid });
      }
      last = m.index + m[0].length;
    }
    if (last < html.length) addText(html.slice(last));
  };

  while ((paraMatch = paraRe.exec(slice)) !== null) {
    const attrs = paraMatch[1];
    const inner = paraMatch[2];
    const styleMatch = /\bstyle="([^"]*)"/i.exec(attrs);
    const style = styleMatch?.[1] ?? "";

    if (["s", "s1", "s2", "ms", "mr"].includes(style)) {
      flushVerse();
      const heading = collectPlain(inner).trim();
      if (heading) content.push({ type: "heading", content: [heading] });
      continue;
    }
    walk(inner);
  }
  flushVerse();

  const bookMeta = manifest.books?.find((b) => b.usfm === book);
  return {
    translationId: "BLB-Draft",
    translationName: manifest.displayName || "Berean Literal Bible (Draft)",
    bookId: book,
    bookName: bookMeta?.nameAsReceived || book,
    chapter: chapterNum,
    content,
    footnotes,
    manifestFetchedAtUtc: manifest.fetchedAtUtc,
  };
}

export function runsFromVerseContent(
  parts: Array<string | FormattedRun | { noteId: string }>,
): { text: string; runs: FormattedRun[] } {
  const runs: FormattedRun[] = [];
  for (const p of parts) {
    if (typeof p === "string") {
      if (p) runs.push({ text: p });
    } else if (p && typeof p === "object" && "text" in p) {
      runs.push(p as FormattedRun);
    }
  }
  const text = runs
    .map((r) => r.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return { text, runs };
}
