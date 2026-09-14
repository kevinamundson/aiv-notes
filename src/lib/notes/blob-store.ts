import { del, get, put } from "@vercel/blob";
import type { AIVNote, NoteCreateInput, NoteUpdateInput } from "@/types/note";
import type { NoteStore } from "@/lib/notes/types";
import {
  applyNoteUpdate,
  assertNoteShape,
  buildNoteFromCreate,
} from "@/lib/notes/validate";
import {
  blobAccessMode,
  blobAuthOptions,
  BLOB_NOT_CONFIGURED_MESSAGE,
  hasBlobCredentials,
  isVercelRuntime,
} from "@/lib/notes/env";
import { NoteStoreUnavailableError } from "@/lib/notes/errors";

const PREFIX = "aiv-notes";

/**
 * Vercel Blob-backed note store for Hobby / production.
 * Path layout mirrors FS (NOTES-CONTRACT):
 *   aiv-notes/by-id/{id}.json
 *   aiv-notes/by-verse/{verseId}.json
 *
 * Private Blob stores use access: 'private' and SDK get() (token/OIDC),
 * never a public CDN fetch of hit.url.
 */
export class BlobNoteStore implements NoteStore {
  private idKey(id: string) {
    return `${PREFIX}/by-id/${id}.json`;
  }

  private verseKey(verseId: string) {
    return `${PREFIX}/by-verse/${verseId}.json`;
  }

  private access() {
    return blobAccessMode();
  }

  private auth() {
    return blobAuthOptions();
  }

  private assertWritable() {
    if (isVercelRuntime() && !hasBlobCredentials()) {
      throw new NoteStoreUnavailableError(BLOB_NOT_CONFIGURED_MESSAGE);
    }
  }

  private async readJson<T>(pathname: string): Promise<T | null> {
    const result = await get(pathname, {
      access: this.access(),
      ...this.auth(),
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    if (!text) return null;
    return JSON.parse(text) as T;
  }

  private async writeJson(pathname: string, data: unknown) {
    this.assertWritable();
    await put(pathname, JSON.stringify(data, null, 2) + "\n", {
      access: this.access(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      ...this.auth(),
    });
  }

  private async deletePath(pathname: string) {
    this.assertWritable();
    await del(pathname, { ...this.auth() });
  }

  async getById(id: string): Promise<AIVNote | null> {
    try {
      return await this.readJson<AIVNote>(this.idKey(id));
    } catch {
      return null;
    }
  }

  private async readVerseIndex(verseId: string): Promise<string[]> {
    try {
      const parsed = await this.readJson<string[]>(this.verseKey(verseId));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
    this.assertWritable();
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
    this.assertWritable();
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
    this.assertWritable();
    const existing = await this.getById(id);
    if (!existing) return;
    for (const v of existing.verseIds) {
      const ids = (await this.readVerseIndex(v)).filter((x) => x !== id);
      await this.writeJson(this.verseKey(v), ids);
    }
    await this.deletePath(this.idKey(id));
  }
}
