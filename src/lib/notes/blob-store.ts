import { del, list, put } from "@vercel/blob";
import type { AIVNote, NoteCreateInput, NoteUpdateInput } from "@/types/note";
import type { NoteStore } from "@/lib/notes/types";
import {
  applyNoteUpdate,
  assertNoteShape,
  buildNoteFromCreate,
} from "@/lib/notes/validate";

const PREFIX = "aiv-notes";

/**
 * Vercel Blob-backed note store for Hobby / production.
 * Path layout mirrors FS: aiv-notes/by-id/{id}.json and aiv-notes/by-verse/{verseId}.json
 */
export class BlobNoteStore implements NoteStore {
  private idKey(id: string) {
    return `${PREFIX}/by-id/${id}.json`;
  }

  private verseKey(verseId: string) {
    return `${PREFIX}/by-verse/${verseId}.json`;
  }

  private async readJson<T>(pathname: string): Promise<T | null> {
    const { blobs } = await list({ prefix: pathname, limit: 10 });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (!hit) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }

  private async writeJson(pathname: string, data: unknown) {
    // Replace existing blob at the same pathname when present (0.27 PutCommandOptions
    // has no allowOverwrite — delete then put).
    const { blobs } = await list({ prefix: pathname, limit: 10 });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (hit) {
      await del(hit.url);
    }
    await put(pathname, JSON.stringify(data, null, 2) + "\n", {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  }

  async getById(id: string): Promise<AIVNote | null> {
    return this.readJson<AIVNote>(this.idKey(id));
  }

  private async readVerseIndex(verseId: string): Promise<string[]> {
    const parsed = await this.readJson<string[]>(this.verseKey(verseId));
    return Array.isArray(parsed) ? parsed : [];
  }

  async listByVerse(verseId: string): Promise<AIVNote[]> {
    const ids = await this.readVerseIndex(verseId);
    const notes: AIVNote[] = [];
    for (const id of ids) {
      const note = await this.getById(id);
      if (note) notes.push(note);
    }
    return notes;
  }

  async create(input: NoteCreateInput): Promise<AIVNote> {
    const note = buildNoteFromCreate(input);
    assertNoteShape(note);
    await this.writeJson(this.idKey(note.id), note);
    for (const verseId of note.verseIds) {
      const ids = await this.readVerseIndex(verseId);
      ids.push(note.id);
      await this.writeJson(this.verseKey(verseId), [...new Set(ids)]);
    }
    return note;
  }

  async update(id: string, input: NoteUpdateInput): Promise<AIVNote> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Note not found: ${id}`);
    const prevVerses = new Set(existing.verseIds);
    const updated = applyNoteUpdate(existing, input);
    assertNoteShape(updated);
    await this.writeJson(this.idKey(id), updated);
    const nextVerses = new Set(updated.verseIds);
    for (const v of prevVerses) {
      if (!nextVerses.has(v)) {
        const ids = (await this.readVerseIndex(v)).filter((x) => x !== id);
        await this.writeJson(this.verseKey(v), ids);
      }
    }
    for (const v of nextVerses) {
      const ids = await this.readVerseIndex(v);
      if (!ids.includes(id)) {
        ids.push(id);
        await this.writeJson(this.verseKey(v), ids);
      }
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    for (const v of existing.verseIds) {
      const ids = (await this.readVerseIndex(v)).filter((x) => x !== id);
      await this.writeJson(this.verseKey(v), ids);
    }
    const { blobs } = await list({ prefix: this.idKey(id), limit: 5 });
    const hit = blobs.find((b) => b.pathname === this.idKey(id));
    if (hit) await del(hit.url);
  }
}
