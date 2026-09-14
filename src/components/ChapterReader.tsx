"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChapterVerseSelector } from "@/components/ChapterVerseSelector";
import { NoteEditor } from "@/components/NoteEditor";
import { BLB_DRAFT_BADGE, BLB_DRAFT_ID } from "@/lib/constants";
import type { ChapterView, VerseRun } from "@/types/scripture";
import type { VerseRef } from "@/types/note";

type Props = {
  chapter: ChapterView;
  canWrite: boolean;
};

function formatFetchedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const chicago = d.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      dateStyle: "medium",
      timeStyle: "short",
    });
    return `${iso} (${chicago} CT)`;
  } catch {
    return iso;
  }
}

function parseVerseId(verseId: string): VerseRef {
  const [book, ch, v] = verseId.split(".");
  return { book, chapter: Number(ch), verse: Number(v) };
}

function expandIds(start: number, end: number, book: string, chapter: number): string[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const ids: string[] = [];
  for (let v = lo; v <= hi; v++) ids.push(`${book}.${chapter}.${v}`);
  return ids;
}

function VerseText({ runs, text }: { runs?: VerseRun[]; text: string }) {
  if (!runs?.length) return <span>{text}</span>;
  return (
    <span>
      {runs.map((r, i) =>
        r.add ? (
          <em key={i} className="italic text-scripture">
            {r.text}
          </em>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </span>
  );
}

/**
 * Product rule (M3): Scripture-column tap opens the note modal;
 * chapter/verse selector verse pick scrolls to that verse AND selects it (opens modal).
 */
export function ChapterReader({ chapter, canWrite }: Props) {
  const [anchor, setAnchor] = useState<number | null>(null);
  const [extent, setExtent] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const verseEls = useRef<Map<number, HTMLElement>>(new Map());
  const hashHandled = useRef<string | null>(null);

  const headingByVerse = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of chapter.headings) m.set(h.beforeVerse, h.text);
    return m;
  }, [chapter.headings]);

  const hasSelection = anchor !== null;
  const rangeStart = anchor ?? chapter.verses[0]?.number ?? 1;
  const rangeEnd = extent ?? rangeStart;
  const lo = Math.min(rangeStart, rangeEnd);
  const hi = Math.max(rangeStart, rangeEnd);
  const verseIds = expandIds(lo, hi, chapter.bookId, chapter.chapter);
  const range = {
    start: parseVerseId(verseIds[0]),
    end: parseVerseId(verseIds[verseIds.length - 1]),
  };

  const selectedVerses = chapter.verses.filter((v) => v.number >= lo && v.number <= hi);
  const quote = selectedVerses.map((v) => v.text).join(" ");
  const excerpt = quote.slice(0, 2000);

  function selectVerse(verseNumber: number, extend: boolean, openModal = true) {
    if (extend && anchor !== null) {
      setExtent(verseNumber);
    } else {
      setAnchor(verseNumber);
      setExtent(verseNumber);
    }
    if (openModal) setModalOpen(true);
  }

  function scrollToVerse(verseNumber: number) {
    const el = verseEls.current.get(verseNumber);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** Selector: scroll + select → opens modal (same as column tap). */
  function onSelectorVerse(verseNumber: number) {
    selectVerse(verseNumber, false, true);
    requestAnimationFrame(() => scrollToVerse(verseNumber));
  }

  // Deep-link from selector navigation: #v12
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      const m = /^#v(\d+)$/.exec(hash);
      if (!m) return;
      const key = `${chapter.bookId}.${chapter.chapter}.${m[1]}`;
      if (hashHandled.current === key) return;
      const n = Number(m[1]);
      if (!chapter.verses.some((v) => v.number === n)) return;
      hashHandled.current = key;
      selectVerse(n, false, true);
      requestAnimationFrame(() => scrollToVerse(n));
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.bookId, chapter.chapter, chapter.verses]);

  // Reset selection when chapter route changes
  useEffect(() => {
    setAnchor(null);
    setExtent(null);
    setModalOpen(false);
  }, [chapter.bookId, chapter.chapter, chapter.translationId]);

  return (
    <div className="relative">
      <section className="font-scripture max-w-scripture text-scripture">
        <header className="mb-6 border-b border-scripture/15 pb-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <ChapterVerseSelector
              translationId={chapter.translationId}
              bookId={chapter.bookId}
              chapter={chapter.chapter}
              loadedVerseCount={chapter.verses.length}
              onSelectVerse={onSelectorVerse}
            />
            <h1 className="text-2xl font-normal">
              {chapter.bookName} {chapter.chapter}
              <span className="ml-2 text-base opacity-70">/ {chapter.translationId}</span>
              {chapter.translationId === BLB_DRAFT_ID || chapter.draft ? (
                <span className="ml-2 inline-block rounded border border-scripture/30 px-1.5 py-0.5 align-middle text-[0.65rem] font-note tracking-wide opacity-80">
                  {chapter.draftBadge ?? BLB_DRAFT_BADGE}
                </span>
              ) : null}
            </h1>
          </div>
          <dl className="mt-2 space-y-1 text-xs opacity-70">
            <div>
              <dt className="inline font-medium">Translation: </dt>
              <dd className="inline">
                {chapter.translationName} ({chapter.translationId})
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Source: </dt>
              <dd className="inline break-all">
                {chapter.sourceUrl.startsWith("http") ? (
                  <a className="underline" href={chapter.sourceUrl} target="_blank" rel="noreferrer">
                    {chapter.sourceUrl}
                  </a>
                ) : (
                  <span>{chapter.sourceUrl}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">fetchedAt: </dt>
              <dd className="inline">{formatFetchedAt(chapter.fetchedAt)}</dd>
            </div>
            {chapter.manifestFetchedAtUtc ? (
              <div>
                <dt className="inline font-medium">manifest fetchedAtUtc: </dt>
                <dd className="inline">{chapter.manifestFetchedAtUtc}</dd>
              </div>
            ) : null}
            {chapter.sourceLastModified ? (
              <div>
                <dt className="inline font-medium">Last-Modified: </dt>
                <dd className="inline">{chapter.sourceLastModified}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-2 font-note text-[0.7rem] text-note-ink/70">
            Tap a verse to open the note modal. Shift-tap (or long-press then tap) to extend a
            same-chapter range. Use {chapter.bookId} {chapter.chapter} to jump chapters or verses.
          </p>
        </header>

        <div className="space-y-3 text-[1.125rem] leading-relaxed">
          {chapter.verses.map((v) => {
            const selected = hasSelection && v.number >= lo && v.number <= hi;
            const endpoint = selected && (v.number === lo || v.number === hi);
            return (
              <div
                key={v.verseId}
                ref={(el) => {
                  if (el) verseEls.current.set(v.number, el);
                  else verseEls.current.delete(v.number);
                }}
              >
                {headingByVerse.has(v.number) ? (
                  <h2 className="mb-2 mt-6 text-lg font-normal opacity-80">
                    {headingByVerse.get(v.number)}
                  </h2>
                ) : null}
                <button
                  type="button"
                  id={`v${v.number}`}
                  onClick={(e) => selectVerse(v.number, e.shiftKey)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    selectVerse(v.number, true);
                  }}
                  className={`block w-full rounded px-1 py-0.5 text-left text-scripture ${
                    selected
                      ? endpoint
                        ? "bg-[rgba(107,127,102,0.18)] ring-1 ring-note-rule/50"
                        : "bg-[rgba(107,127,102,0.14)]"
                      : "hover:bg-scripture/5"
                  }`}
                >
                  <span
                    className={`mr-2 inline-block min-w-[1.5ch] text-[0.75em] tabular-nums ${
                      selected ? "text-scripture/80" : "text-scripture/60"
                    }`}
                  >
                    {v.number}
                  </span>
                  <VerseText runs={v.runs} text={v.text} />
                </button>
              </div>
            );
          })}
        </div>

        {chapter.footnotes?.length ? (
          <footer className="mt-8 border-t border-scripture/10 pt-4 font-note text-xs text-scripture/60">
            <p className="mb-2 font-medium">Apparatus (translation notes — not AIV)</p>
            <ul className="space-y-1">
              {chapter.footnotes.map((f) => (
                <li key={f.noteId}>
                  <span className="opacity-70">{f.caller}</span> {f.text}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </section>

      {/* Quiet empty hint when no modal — not a compose side-sheet */}
      {!modalOpen ? (
        <p className="mt-6 max-w-note font-note text-xs text-note-ink/70">
          <span className="font-semibold text-note-ink">Kevin&apos;s comment (not Scripture)</span>
          {" — "}
          tap a verse to compose. No note open.
        </p>
      ) : null}

      {modalOpen && hasSelection ? (
        <NoteEditor
          range={range}
          verseIds={verseIds}
          canWrite={canWrite}
          scriptureQuote={quote}
          scriptureExcerpt={excerpt}
          translationId={chapter.translationId}
          sourceUrl={chapter.sourceUrl}
          fetchedAt={chapter.fetchedAt}
          variant="modal"
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
