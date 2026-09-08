"use client";

import { useCallback, useEffect, useState } from "react";
import { DictateButton } from "@/components/DictateButton";
import type { AIVNote, NoteStatus, NoteVisibility } from "@/types/note";
import { NOTE_LABEL } from "@/types/note";

type Props = {
  verseId: string;
  canWrite: boolean;
  scriptureExcerpt?: string;
  translationId?: string;
  sourceUrl?: string;
  fetchedAt?: string;
};

export function NoteEditor({
  verseId,
  canWrite,
  scriptureExcerpt,
  translationId,
  sourceUrl,
  fetchedAt,
}: Props) {
  const [notes, setNotes] = useState<AIVNote[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<NoteStatus>("draft-for-kevin");
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/notes?verseId=${encodeURIComponent(verseId)}`);
    const data = (await res.json()) as { notes?: AIVNote[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load notes");
      return;
    }
    setNotes(data.notes ?? []);
    setError(null);
  }, [verseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDictate = useCallback((piece: string) => {
    setText((prev) => (prev ? `${prev.trim()} ${piece}` : piece));
  }, []);

  async function save() {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        bodyText: text,
        status,
        visibility,
        verseIds: [verseId],
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
      await load();
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
  }

  return (
    <aside className="font-note max-w-note border-l-[2px] border-note-rule pl-4 text-note-ink">
      <p className="mb-3 text-xs font-semibold tracking-wide">{NOTE_LABEL}</p>
      <p className="mb-4 text-xs opacity-70">Verse {verseId}</p>

      {notes.length === 0 ? (
        <p className="mb-4 text-sm opacity-70">No note yet for this verse.</p>
      ) : (
        <ul className="mb-6 space-y-4">
          {notes.map((n) => (
            <li key={n.id} className="text-sm leading-relaxed">
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide opacity-80">
                {NOTE_LABEL}
              </p>
              <p className="whitespace-pre-wrap">{n.body.text}</p>
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
        <div className="space-y-2">
          <label className="block text-xs font-medium">
            {editingId ? "Edit note" : "New note"}
            <textarea
              className="mt-1 w-full rounded border border-note-rule/40 bg-parchment p-2 text-sm text-note-ink"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Kevin's interpretive comment (never Scripture)"
            />
          </label>
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
            Policy: public requires approved-by-kevin.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => void save()}
              className="rounded bg-note-rule px-3 py-1 text-xs text-parchment disabled:opacity-50"
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
    </aside>
  );
}
