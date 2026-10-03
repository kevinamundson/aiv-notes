"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookDisplayName,
  chapterCount,
  verseCount,
} from "@/lib/canon";

type Props = {
  translationId: string;
  bookId: string;
  chapter: number;
  /** Exact verse count for the loaded chapter when available. */
  loadedVerseCount?: number;
  /** Called when a verse in the *current* chapter is chosen (scroll + select → modal). */
  onSelectVerse: (verse: number) => void;
};

/**
 * Scripture-chrome chapter/verse selector (M3 §4).
 * Location navigation only — not the notes modal; no olive body text on list items.
 * Product rule: picking a verse selects it (opens note modal via ChapterReader).
 */
export function ChapterVerseSelector({
  translationId,
  bookId,
  chapter,
  loadedVerseCount,
  onSelectVerse,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"chapters" | "verses">("chapters");
  const [pickChapter, setPickChapter] = useState(chapter);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  const chapters = chapterCount(bookId);
  const bookName = bookDisplayName(bookId);
  const versesForPick =
    pickChapter === chapter && loadedVerseCount
      ? loadedVerseCount
      : verseCount(bookId, pickChapter);

  useEffect(() => {
    if (!open) return;
    setPickChapter(chapter);
    setStep("chapters");
  }, [open, chapter]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  function chooseChapter(n: number) {
    setPickChapter(n);
    setStep("verses");
  }

  function chooseVerse(v: number) {
    setOpen(false);
    if (pickChapter !== chapter) {
      // Navigate; hash lets the new page scroll+select after load.
      router.push(
        `/${encodeURIComponent(translationId)}/${bookId}/${pickChapter}#v${v}`,
      );
      return;
    }
    onSelectVerse(v);
  }

  function goChapterOnly() {
    setOpen(false);
    if (pickChapter !== chapter) {
      router.push(
        `/${encodeURIComponent(translationId)}/${bookId}/${pickChapter}`,
      );
    }
  }

  const cell =
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-scripture/15 bg-parchment font-note text-sm text-scripture/80 hover:border-scripture/40 hover:bg-scripture/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-scripture/30";

  return (
    <div className="relative inline-block font-note" ref={rootRef}>
      <button
        type="button"
        className="rounded border border-scripture/20 bg-parchment px-2.5 py-1.5 text-sm text-scripture/75 hover:border-scripture/40"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tabular-nums tracking-wide">
          {bookId} {chapter}
        </span>
        <span className="ml-1.5 opacity-50" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="absolute left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-md border border-scripture/15 bg-parchment p-3 shadow-[0_8px_24px_rgba(26,24,20,0.12)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p id={titleId} className="text-xs font-medium text-scripture/70">
              {bookName} — {step === "chapters" ? "Chapter" : `Chapter ${pickChapter} · Verse`}
            </p>
            <button
              type="button"
              className="text-xs text-scripture/60 underline"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          {step === "verses" ? (
            <button
              type="button"
              className="mb-2 text-xs text-scripture/60 underline"
              onClick={() => setStep("chapters")}
            >
              ← Chapters
            </button>
          ) : null}

          {step === "chapters" ? (
            <div
              className="grid max-h-[50vh] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-6"
              role="listbox"
              aria-label="Chapters"
            >
              {Array.from({ length: chapters }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="option"
                  aria-selected={n === chapter}
                  className={`${cell} ${n === chapter ? "border-scripture/40 bg-scripture/5 font-medium text-scripture" : ""}`}
                  onClick={() => chooseChapter(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div
                className="grid max-h-[50vh] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-6"
                role="listbox"
                aria-label={`Verses in chapter ${pickChapter}`}
              >
                {Array.from({ length: versesForPick }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={cell}
                    onClick={() => chooseVerse(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded border border-scripture/20 py-2 text-xs text-scripture/70 hover:bg-scripture/5"
                onClick={goChapterOnly}
              >
                Open {bookId} {pickChapter} (chapter only)
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
