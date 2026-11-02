/**
 * AIV (eng_aiv) USX → reader chapter JSON.
 * Port of Ezra's usx_to_seed_chapter.py. Does not vendor Seed Bible AGPL.
 * Marker map:
 *   para@s/s1/s2/s3/ms/ms1/mr → heading (section)
 *   para@qa                  → heading (acrostic letter; closes the previous verse)
 *   para@r                   → heading (parallel-passage refs)
 *   para@d                   → subtitle (Psalm superscription, or postscript when
 *                              it follows the chapter's last verse); a `d` that
 *                              holds a verse (HAB 3:1) is read as that verse
 *   para@cls                 → verse text (colophons; `p vid=` continues the verse)
 *   para@h/toc1-3/mt1/rem    → book-level, before chapter 1 (h/toc/mt give the book name)
 *   verse@eid                → closes the verse, so later paras never join it
 *   char@add → italic; note@f/x → apparatus (not AIV notes)
 */

/** aivbible metadata.json (subset). */
export type AivMetadata = {
  id?: string;
  name?: string;
  englishName?: string;
  shortName?: string;
};

export type HeadingKind = "section" | "ref" | "subtitle";

export type FormattedRun = {
  text: string;
  add?: boolean;
  wordsOfJesus?: boolean;
};

export type UsxChapterResult = {
  bookId: string;
  bookName: string;
  chapter: number;
  content: Array<
    | { type: "heading"; kind: HeadingKind; content: string[] }
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
};

function collectPlain(xml: string): string {
  return xml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
}

const SECTION_STYLES = ["s", "s1", "s2", "s3", "ms", "ms1", "mr", "qa"];

/** Book name from the book-level `h`, `toc2`, `toc1` or `mt1` para (before chapter 1). */
export function usxBookName(usxXml: string): string | null {
  const firstChapter = usxXml.search(/<chapter\b/i);
  const head = firstChapter >= 0 ? usxXml.slice(0, firstChapter) : usxXml;
  for (const style of ["h", "toc2", "toc1", "mt1", "mt"]) {
    const m = new RegExp(`<para\\b[^>]*\\bstyle="${style}"[^>]*>([\\s\\S]*?)</para>`, "i").exec(head);
    const name = m ? collectPlain(m[1]).trim() : "";
    if (name) return name;
  }
  return null;
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
): UsxChapterResult {
  const content: UsxChapterResult["content"] = [];
  const footnotes: UsxChapterResult["footnotes"] = [];
  let noteCounter = 1;
  let currentVerse: number | null = null;
  let verseContent: Array<string | FormattedRun | { noteId: string }> = [];
  /** Verse already emitted that a `vid=` para continues after a heading (GEN 2:4 in pass 5). */
  let resumeItem: { content: typeof verseContent } | null = null;

  const flushVerse = () => {
    if (currentVerse !== null) {
      const merged: typeof verseContent = resumeItem ? [...resumeItem.content] : [];
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
      if (resumeItem) resumeItem.content = merged;
      else content.push({ type: "verse", number: currentVerse, content: merged });
    }
    resumeItem = null;
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
          // End of verse: later paras (d postscript, qa) must not join it.
          flushVerse();
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

    const holdsVerse = /<verse\b[^>]*\bsid\s*=/i.test(inner);
    const kind: HeadingKind | null = SECTION_STYLES.includes(style)
      ? "section"
      : style === "r"
        ? "ref"
        : style === "d" && !holdsVerse
          ? "subtitle"
          : null;
    if (kind) {
      flushVerse();
      // Footnotes inside a heading go to the apparatus, not into the heading text.
      const noteRe = /<note\b([^>]*)>([\s\S]*?)<\/note>/gi;
      for (const n of inner.matchAll(noteRe)) {
        const nStyle = /\bstyle="([^"]*)"/i.exec(n[1])?.[1];
        footnotes.push({
          noteId: `note-${noteCounter++}`,
          text: collectPlain(n[2]).trim(),
          caller: /\bcaller="([^"]*)"/i.exec(n[1])?.[1] ?? "+",
          kind: nStyle === "f" ? "footnote" : "crossReference",
        });
      }
      const heading = collectPlain(inner.replace(noteRe, "")).trim();
      if (heading) content.push({ type: "heading", kind, content: [heading] });
      continue;
    }
    // A `vid=` para after a heading continues a verse that was closed by that heading
    // (e.g. cls colophon, s1, then the rest of the verse). Keep it one verse.
    const vid = /\bvid="[^"]*?:(\d+)"/i.exec(attrs);
    if (vid && currentVerse === null) {
      const n = Number(vid[1]);
      const target = [...content]
        .reverse()
        .find((c) => c.type === "verse");
      if (target && target.type === "verse" && target.number === n) {
        resumeItem = target;
        currentVerse = n;
        verseContent = [];
      }
    }
    walk(inner);
  }
  flushVerse();

  // A `d` between two verses (EXO 28:36, EXO 39:30, DAN 5:25 inscriptions) is not a
  // title or postscript: keep its words with the verse before it, as this reader always has.
  for (let i = content.length - 2; i > 0; i--) {
    const item = content[i];
    const prev = content[i - 1];
    if (item.type !== "heading" || item.kind !== "subtitle" || prev.type !== "verse") continue;
    if (!content.slice(i + 1).some((c) => c.type === "verse")) continue;
    prev.content.push(` ${item.content.join(" ")}`);
    content.splice(i, 1);
  }

  return {
    bookId: book,
    bookName: usxBookName(usxXml) || book,
    chapter: chapterNum,
    content,
    footnotes,
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
