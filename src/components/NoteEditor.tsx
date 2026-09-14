"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DictateButton } from "@/components/DictateButton";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { NoteMarkdown } from "@/components/NoteMarkdown";
import { bookDisplayName } from "@/lib/canon";
import type { AIVNote, NoteStatus, NoteVisibility, VerseRef } from "@/types/note";
import { NOTE_LABEL } from "@/types/note";

type Props = {
  /** Inclusive attachment range (same chapter). */
  range: { start: VerseRef; end: VerseRef };
  verseIds: string[];
  canWrite: boolean;
  /** Full selected verse wording for the modal quote (Scripture voice). */
  scriptureQuote?: string;
  scriptureExcerpt?: string;
  translationId?: string;
  sourceUrl?: string;
  fetchedAt?: string;
  /** M3: modal is primary compose path. */
  variant?: "modal" | "pane";
  onClose?: () => void;
  onSaved?: () => void;
};

function displayRef(range: { start: VerseRef; end: VerseRef }): string {
  const { start, end } = range;
  const name = bookDisplayName(start.book);
  if (start.verse === end.verse) {
    return `${name} ${start.chapter}:${start.verse}`;
  }
  return `${name} ${start.chapter}:${start.verse}–${end.verse}`;
}

/** Continuous excerpt; if very long, first + ellipsis + last. */
function formatQuote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 900) return trimmed;
  const head = trimmed.slice(0, 420).trimEnd();
  const tail = trimmed.slice(-280).trimStart();
  return `${head} … ${tail}`;
}

export function NoteEditor({
  range,
  verseIds,
  canWrite,
  scriptureQuote,
  scriptureExcerpt,
  translationId,
  sourceUrl,
  fetchedAt,
  variant = "modal",
  onClose,
  onSaved,
}: Props) {
  const [notes, setNotes] = useState<AIVNote[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<NoteStatus>("draft-for-kevin");
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const labelId = useId();

  const primaryVerseId = verseIds[0];
  const quote = formatQuote(scriptureQuote || scriptureExcerpt || "");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/notes?verseId=${encodeURIComponent(primaryVerseId)}`,
    );
    const data = (await res.json()) as { notes?: AIVNote[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load notes");
      return;
    }
    setNotes(data.notes ?? []);
    setError(null);
  }, [primaryVerseId]);

  useEffect(() => {
    void load();
    setText("");
    setEditingId(null);
    setStatus("draft-for-kevin");
    setVisibility("private");
    setDirty(false);
    setDetailsOpen(false);
  }, [load, range.start.verse, range.end.verse, range.start.book, range.start.chapter]);

  const onDictate = useCallback((piece: string) => {
    setText((prev) => (prev ? `${prev.trim()} ${piece}` : piece));
    setDirty(true);
  }, []);

  const dirtyRef = useRef(false);
  const textRef = useRef("");
  dirtyRef.current = dirty;
  textRef.current = text;

  function requestClose() {
    if (dirtyRef.current && textRef.current.trim()) {
      if (!confirm("Discard unsaved note text?")) return;
    }
    onClose?.();
  }

  // Focus trap + Esc for modal (mount only — do not re-focus while typing)
  useEffect(() => {
    if (variant !== "modal") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    const preferred = textareaRef.current ?? focusables()[0];
    preferred?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (dirtyRef.current && textRef.current.trim()) {
          if (!confirm("Discard unsaved note text?")) return;
        }
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault();
          list[list.length - 1]?.focus();
        }
      } else if (i === list.length - 1 || i < 0) {
        e.preventDefault();
        list[0]?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [variant, onClose]);

  async function save() {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        bodyText: text,
        status,
        visibility,
        range: {
          start: {
            book: range.start.book,
            chapter: range.start.chapter,
            verse: Math.min(range.start.verse, range.end.verse),
          },
          end: {
            book: range.end.book,
            chapter: range.end.chapter,
            verse: Math.max(range.start.verse, range.end.verse),
          },
        },
        scriptureCite:
          translationId || scriptureExcerpt || scriptureQuote
            ? {
                translationId,
                sourceUrl,
                fetchedAt,
                excerpt: (scriptureExcerpt || scriptureQuote || "").slice(0, 2000),
              }
            : undefined,
      };
      const res = await fetch(
        editingId ? `/api/notes/${encodeURIComponent(editingId)}` : "/api/notes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setText("");
      setEditingId(null);
      setStatus("draft-for-kevin");
      setVisibility("private");
      setDirty(false);
      await load();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!canWrite) return;
    if (!confirm("Delete this note?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(note: AIVNote) {
    setEditingId(note.id);
    setText(note.body.text);
    setStatus(note.status);
    setVisibility(note.visibility);
    setDirty(false);
  }

  const body = (
    <>
      {/* 1. Reference */}
      <p className="font-note text-xs tracking-wide text-note-rule/90 opacity-90">
        {displayRef(range)}
      </p>

      {/* 2. Selected verse text — Scripture voice, not editable, not olive */}
      {quote ? (
        <blockquote className="mt-2 max-h-[8.5rem] overflow-y-auto border-l border-scripture/20 pl-3 font-scripture text-[0.95rem] leading-relaxed text-scripture">
          {quote}
        </blockquote>
      ) : null}

      {/* 3. Never-Scripture label */}
      <div className="mt-4 flex items-start justify-between gap-2">
        <p id={labelId} className="text-xs font-semibold tracking-wide text-note-ink">
          {NOTE_LABEL}
        </p>
        {onClose ? (
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] shrink-0 rounded border border-note-rule/40 text-sm md:min-h-0 md:min-w-0 md:px-2 md:py-1"
            onClick={requestClose}
            aria-label="Close note"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="mb-4 text-sm opacity-70">No note yet for this selection.</p>
        ) : (
          <ul className="mb-4 space-y-4">
            {notes.map((n) => (
              <li key={n.id} className="text-sm leading-relaxed">
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide opacity-80">
                  {NOTE_LABEL}
                </p>
                <NoteMarkdown text={n.body.text} />
                <p className="mt-1 text-[0.65rem] opacity-60">
                  {n.status} · {n.visibility}
                </p>
                {canWrite ? (
                  <div className="mt-1 flex gap-2 text-xs">
                    <button type="button" className="underline" onClick={() => beginEdit(n)}>
                      Edit
                    </button>
                    <button type="button" className="underline" onClick={() => void remove(n.id)}>
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          <div className="flex min-h-0 flex-col space-y-2">
            <p className="text-xs font-medium">{editingId ? "Edit note" : "New note"}</p>
            <MarkdownToolbar
              value={text}
              onChange={(next) => {
                setText(next);
                setDirty(true);
              }}
              textareaRef={textareaRef}
              defaultCite={primaryVerseId}
              disabled={busy}
            />
            <textarea
              ref={textareaRef}
              className="min-h-[10rem] w-full flex-1 rounded border border-note-rule/40 bg-parchment p-3 font-note text-sm leading-relaxed text-note-ink md:min-h-[12rem]"
              style={{ maxWidth: "45ch" }}
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
              placeholder="Write here — never Scripture. **bold** *italic*"
              aria-labelledby={labelId}
            />
            <DictateButton onTranscript={onDictate} disabled={busy} />

            <details
              className="text-xs"
              open={detailsOpen}
              onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer select-none opacity-70">Details</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                <label>
                  Status{" "}
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as NoteStatus)}
                    className="border border-note-rule/40 bg-parchment"
                  >
                    <option value="draft-for-kevin">draft-for-kevin</option>
                    <option value="approved-by-kevin">approved-by-kevin</option>
                  </select>
                </label>
                <label>
                  Visibility{" "}
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as NoteVisibility)}
                    className="border border-note-rule/40 bg-parchment"
                  >
                    <option value="private">private</option>
                    <option value="house">house</option>
                    <option value="public">public</option>
                  </select>
                </label>
              </div>
              <p className="mt-1 opacity-60">
                Policy: public requires approved-by-kevin. In-body refs do not change attachment
                range.
              </p>
            </details>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busy || !text.trim()}
                onClick={() => void save()}
                className="min-h-[44px] rounded bg-note-rule px-3 py-1 text-xs text-parchment disabled:opacity-50 md:min-h-0"
              >
                {editingId ? "Update" : "Save"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => {
                    setEditingId(null);
                    setText("");
                    setDirty(false);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs opacity-70">
            Sign in as an allowlisted writer to create or edit notes.
          </p>
        )}

        {error ? <p className="mt-2 text-xs text-red-800">{error}</p> : null}
      </div>
    </>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-scripture/50"
          aria-label="Dismiss note modal"
          onClick={requestClose}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-[36rem] flex-col overflow-hidden rounded-md border-2 border-note-rule bg-parchment p-4 text-note-ink shadow-[0_12px_40px_rgba(26,24,20,0.18)] sm:p-6 md:max-w-[40rem]"
          style={{ marginLeft: "max(0px, env(safe-area-inset-left))", marginRight: "max(0px, env(safe-area-inset-right))" }}
        >
          <h2 id={titleId} className="sr-only">
            Note for {displayRef(range)}
          </h2>
          <div className="font-note flex min-h-0 flex-1 flex-col">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <aside className="font-note max-w-note border-l-[2px] border-note-rule pl-4 text-note-ink">
      {body}
    </aside>
  );
}
