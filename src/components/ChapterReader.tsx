"use client";

import { useEffect, useMemo, useState } from "react";
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

export function ChapterReader({ chapter, canWrite }: Props) {
  const firstId = chapter.verses[0]?.verseId ?? null;
  const [anchor, setAnchor] = useState<number | null>(
    chapter.verses[0]?.number ?? null,
  );
  const [extent, setExtent] = useState<number | null>(
    chapter.verses[0]?.number ?? null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const headingByVerse = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of chapter.headings) m.set(h.beforeVerse, h.text);
    return m;
  }, [chapter.headings]);

  const rangeStart = anchor ?? chapter.verses[0]?.number ?? 1;
  const rangeEnd = extent ?? rangeStart;
  const lo = Math.min(rangeStart, rangeEnd);
  const hi = Math.max(rangeStart, rangeEnd);
  const verseIds = expandIds(lo, hi, chapter.bookId, chapter.chapter);
  const range = {
    start: parseVerseId(verseIds[0]),
    end: parseVerseId(verseIds[verseIds.length - 1]),
  };

  const excerpt = chapter.verses
    .filter((v) => v.number >= lo && v.number <= hi)
    .map((v) => v.text)
    .join(" ")
    .slice(0, 2000);

  function selectVerse(verseNumber: number, extend: boolean) {
    if (extend && anchor !== null) {
      setExtent(verseNumber);
    } else {
      setAnchor(verseNumber);
      setExtent(verseNumber);
    }
    if (isMobile) setSheetOpen(true);
  }

  const showSheet = isMobile && sheetOpen && firstId;
  const showPane = !isMobile && firstId;

  return (
    <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <section className="font-scripture max-w-scripture text-scripture">
        <header className="mb-6 border-b border-scripture/15 pb-4">
          <h1 className="text-2xl font-normal">
            {chapter.bookName} {chapter.chapter}
            <span className="ml-2 text-base opacity-70">/ {chapter.translationId}</span>
            {chapter.translationId === BLB_DRAFT_ID || chapter.draft ? (
              <span className="ml-2 inline-block rounded border border-scripture/30 px-1.5 py-0.5 align-middle text-[0.65rem] font-note tracking-wide opacity-80">
                {chapter.draftBadge ?? BLB_DRAFT_BADGE}
              </span>
            ) : null}
          </h1>
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
            Tap a verse for a note. Shift-tap (or long-press then tap) to extend a same-chapter
            range.
          </p>
        </header>

        <div className="space-y-3 text-[1.125rem] leading-relaxed">
          {chapter.verses.map((v) => {
            const selected = v.number >= lo && v.number <= hi;
            const endpoint = v.number === lo || v.number === hi;
            return (
              <div key={v.verseId}>
                {headingByVerse.has(v.number) ? (
                  <h2 className="mb-2 mt-6 text-lg font-normal opacity-80">
                    {headingByVerse.get(v.number)}
                  </h2>
                ) : null}
                <button
                  type="button"
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

      {showPane ? (
        <NoteEditor
          range={range}
          verseIds={verseIds}
          canWrite={canWrite}
          scriptureExcerpt={excerpt}
          translationId={chapter.translationId}
          sourceUrl={chapter.sourceUrl}
          fetchedAt={chapter.fetchedAt}
          variant="pane"
        />
      ) : !isMobile ? (
        <aside className="font-note max-w-note border-l-[2px] border-note-rule pl-4 text-note-ink">
          <p className="text-xs font-semibold">Kevin&apos;s comment (not Scripture)</p>
          <p className="mt-2 text-sm opacity-70">Tap a verse to open the notes pane.</p>
        </aside>
      ) : null}

      {/* Mobile: bottom sheet ≥45–60% viewport (Bezalel M2) */}
      {showSheet ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-scripture/30"
            aria-label="Dismiss note sheet"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] min-h-[50vh] overflow-hidden rounded-t-lg shadow-lg">
            <NoteEditor
              range={range}
              verseIds={verseIds}
              canWrite={canWrite}
              scriptureExcerpt={excerpt}
              translationId={chapter.translationId}
              sourceUrl={chapter.sourceUrl}
              fetchedAt={chapter.fetchedAt}
              variant="sheet"
              onClose={() => setSheetOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
