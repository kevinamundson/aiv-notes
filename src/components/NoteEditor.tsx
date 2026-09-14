"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DictateButton } from "@/components/DictateButton";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { NoteMarkdown } from "@/components/NoteMarkdown";
import type { AIVNote, NoteStatus, NoteVisibility, VerseRef } from "@/types/note";
import { NOTE_LABEL } from "@/types/note";

type Props = {
  /** Inclusive attachment range (same chapter). */
  range: { start: VerseRef; end: VerseRef };
  verseIds: string[];
  canWrite: boolean;
  scriptureExcerpt?: string;
  translationId?: string;
  sourceUrl?: string;
  fetchedAt?: string;
  /** Mobile bottom sheet presentation. */
  variant?: "pane" | "sheet";
  onClose?: () => void;
  onSaved?: () => void;
};

function rangeLabel(range: { start: VerseRef; end: VerseRef }): string {
  const { start, end } = range;
  if (start.verse === end.verse) {
    return `${start.book}.${start.chapter}.${start.verse}`;
  }
  return `${start.book} ${start.chapter}:${start.verse}–${end.verse}`;
}

export function NoteEditor({
  range,
  verseIds,
  canWrite,
  scriptureExcerpt,
  translationId,
  sourceUrl,
  fetchedAt,
  variant = "pane",
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const primaryVerseId = verseIds[0];

  const load = useCallback(async () => {
    // Load notes attached to any verse in the selection (union by first id is enough for index).
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
    // New-note defaults when selection changes (Baruch M2).
    setText("");
    setEditingId(null);
    setStatus("draft-for-kevin");
    setVisibility("private");
    setDirty(false);
  }, [load, range.start.verse, range.end.verse, range.start.book, range.start.chapter]);

  const onDictate = useCallback((piece: string) => {
    setText((prev) => (prev ? `${prev.trim()} ${piece}` : piece));
    setDirty(true);
  }, []);

  async function save() {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      // Server recomputes verseIds from range — send range, not a stale client list.
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
          translationId || scriptureExcerpt
            ? {
                translationId,
                sourceUrl,
                fetchedAt,
                excerpt: scriptureExcerpt?.slice(0, 2000),
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

  function requestClose() {
    if (dirty && text.trim()) {
      if (!confirm("Discard unsaved note text?")) return;
    }
    onClose?.();
  }

  const shellClass =
    variant === "sheet"
      ? "font-note flex max-h-[85vh] flex-col border-t-[2px] border-note-rule bg-parchment p-4 text-note-ink"
      : "font-note max-w-note border-l-[2px] border-note-rule pl-4 text-note-ink";

  return (
    <aside className={shellClass}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide">{NOTE_LABEL}</p>
          <p className="mt-1 text-xs opacity-70">Attached: {rangeLabel(range)}</p>
        </div>
        {variant === "sheet" && onClose ? (
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded border border-note-rule/40 text-sm"
            onClick={requestClose}
            aria-label="Close note sheet"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className={variant === "sheet" ? "min-h-0 flex-1 overflow-y-auto" : ""}>
        {notes.length === 0 ? (
          <p className="mb-4 text-sm opacity-70">No note yet for this selection.</p>
        ) : (
          <ul className="mb-6 space-y-4">
            {notes.map((n) => (
              <li key={n.id} className="text-sm leading-relaxed">
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide opacity-80">
                  {NOTE_LABEL}
                </p>
                <NoteMarkdown text={n.body.text} />
                <p className="mt-1 text-[0.65rem] opacity-60">
                  {n.status} · {n.visibility} ·{" "}
                  {n.range.start.verse === n.range.end.verse
                    ? n.verseIds[0]
                    : `${n.range.start.book} ${n.range.start.chapter}:${n.range.start.verse}–${n.range.end.verse}`}
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
          <div className="space-y-2">
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
              className="mt-1 w-full rounded border border-note-rule/40 bg-parchment p-2 text-sm text-note-ink"
              rows={variant === "sheet" ? 6 : 6}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
              placeholder="Kevin's interpretive comment (never Scripture). Markdown: **bold** *italic* [[GEN.1.1]] [label](https://…)"
            />
            <DictateButton onTranscript={onDictate} disabled={busy} />
            <div className="flex flex-wrap gap-2 text-xs">
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
            <p className="text-[0.65rem] opacity-60">
              Policy: public requires approved-by-kevin. In-body refs do not change attachment
              range. Server recomputes verseIds from range on save.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !text.trim()}
                onClick={() => void save()}
                className="min-h-[44px] rounded bg-note-rule px-3 py-1 text-xs text-parchment disabled:opacity-50 md:min-h-0"
              >
                {editingId ? "Update" : "Create"}
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
    </aside>
  );
}
