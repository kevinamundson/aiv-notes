"use client";

import { useMemo, useState } from "react";
import { NoteEditor } from "@/components/NoteEditor";
import type { ChapterView } from "@/types/scripture";

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

export function ChapterReader({ chapter, canWrite }: Props) {
  const [selected, setSelected] = useState<string | null>(
    chapter.verses[0]?.verseId ?? null,
  );

  const headingByVerse = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of chapter.headings) m.set(h.beforeVerse, h.text);
    return m;
  }, [chapter.headings]);

  const selectedVerse = chapter.verses.find((v) => v.verseId === selected);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <section className="font-scripture max-w-scripture text-scripture">
        <header className="mb-6 border-b border-scripture/15 pb-4">
          <h1 className="text-2xl font-normal">
            {chapter.bookName} {chapter.chapter}
            <span className="ml-2 text-base opacity-70">/ {chapter.translationId}</span>
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
                <a className="underline" href={chapter.sourceUrl} target="_blank" rel="noreferrer">
                  {chapter.sourceUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">fetchedAt: </dt>
              <dd className="inline">{formatFetchedAt(chapter.fetchedAt)}</dd>
            </div>
            {chapter.sourceLastModified ? (
              <div>
                <dt className="inline font-medium">Last-Modified: </dt>
                <dd className="inline">{chapter.sourceLastModified}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <div className="space-y-3 text-[1.125rem] leading-relaxed">
          {chapter.verses.map((v) => (
            <div key={v.verseId}>
              {headingByVerse.has(v.number) ? (
                <h2 className="mb-2 mt-6 text-lg font-normal opacity-80">
                  {headingByVerse.get(v.number)}
                </h2>
              ) : null}
              <button
                type="button"
                onClick={() => setSelected(v.verseId)}
                className={`block w-full rounded px-1 py-0.5 text-left hover:bg-scripture/5 ${
                  selected === v.verseId ? "bg-scripture/5 ring-1 ring-note-rule/40" : ""
                }`}
              >
                <span className="mr-2 inline-block min-w-[1.5ch] text-[0.75em] tabular-nums text-scripture/60">
                  {v.number}
                </span>
                <span>{v.text}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <NoteEditor
          verseId={selected}
          canWrite={canWrite}
          scriptureExcerpt={selectedVerse?.text}
          translationId={chapter.translationId}
          sourceUrl={chapter.sourceUrl}
          fetchedAt={chapter.fetchedAt}
        />
      ) : (
        <aside className="font-note max-w-note border-l-[2px] border-note-rule pl-4 text-note-ink">
          <p className="text-xs font-semibold">Kevin&apos;s comment (not Scripture)</p>
          <p className="mt-2 text-sm opacity-70">Tap a verse to open the notes pane.</p>
        </aside>
      )}
    </div>
  );
}
