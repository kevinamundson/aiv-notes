import { promises as fs } from "fs";
import path from "path";
import type { AIVNote, NoteCreateInput, NoteUpdateInput } from "@/types/note";
import type { NoteStore } from "@/lib/notes/types";
import {
  applyNoteUpdate,
  assertNoteShape,
  buildNoteFromCreate,
} from "@/lib/notes/validate";

const DATA_ROOT = path.join(process.cwd(), "data", "aiv-notes");

export class FsNoteStore implements NoteStore {
  private byIdDir = path.join(DATA_ROOT, "by-id");
  private byVerseDir = path.join(DATA_ROOT, "by-verse");

  private async ensureDirs() {
    await fs.mkdir(this.byIdDir, { recursive: true });
    await fs.mkdir(this.byVerseDir, { recursive: true });
  }

  private idPath(id: string) {
    return path.join(this.byIdDir, `${id}.json`);
  }

  private versePath(verseId: string) {
    // verseId like GEN.1.1 — safe as filename
    return path.join(this.byVerseDir, `${verseId}.json`);
  }

  async getById(id: string): Promise<AIVNote | null> {
    await this.ensureDirs();
    try {
      const raw = await fs.readFile(this.idPath(id), "utf8");
      return JSON.parse(raw) as AIVNote;
    } catch {
      return null;
    }
  }

  private async readVerseIndex(verseId: string): Promise<string[]> {
    try {
      const raw = await fs.readFile(this.versePath(verseId), "utf8");
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeVerseIndex(verseId: string, ids: string[]) {
    await fs.writeFile(
      this.versePath(verseId),
      JSON.stringify([...new Set(ids)], null, 2) + "\n",
      "utf8",
    );
  }

  async listByVerse(verseId: string): Promise<AIVNote[]> {
    await this.ensureDirs();
    const ids = await this.readVerseIndex(verseId);
    const notes: AIVNote[] = [];
    for (const id of ids) {
      const note = await this.getById(id);
      if (note) notes.push(note);
    }
    return notes;
  }

  async create(input: NoteCreateInput): Promise<AIVNote> {
    await this.ensureDirs();
    const note = buildNoteFromCreate(input);
    assertNoteShape(note);
    await fs.writeFile(this.idPath(note.id), JSON.stringify(note, null, 2) + "\n", "utf8");
    for (const verseId of note.verseIds) {
      const ids = await this.readVerseIndex(verseId);
      ids.push(note.id);
      await this.writeVerseIndex(verseId, ids);
    }
    return note;
  }

  async update(id: string, input: NoteUpdateInput): Promise<AIVNote> {
    await this.ensureDirs();
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Note not found: ${id}`);
    const prevVerses = new Set(existing.verseIds);
    const updated = applyNoteUpdate(existing, input);
    assertNoteShape(updated);
    await fs.writeFile(this.idPath(id), JSON.stringify(updated, null, 2) + "\n", "utf8");
    const nextVerses = new Set(updated.verseIds);
    for (const v of prevVerses) {
      if (!nextVerses.has(v)) {
        const ids = (await this.readVerseIndex(v)).filter((x) => x !== id);
        await this.writeVerseIndex(v, ids);
      }
    }
    for (const v of nextVerses) {
      const ids = await this.readVerseIndex(v);
      if (!ids.includes(id)) {
        ids.push(id);
        await this.writeVerseIndex(v, ids);
      }
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureDirs();
    const existing = await this.getById(id);
    if (!existing) return;
    for (const v of existing.verseIds) {
      const ids = (await this.readVerseIndex(v)).filter((x) => x !== id);
      await this.writeVerseIndex(v, ids);
    }
    try {
      await fs.unlink(this.idPath(id));
    } catch {
      /* already gone */
    }
  }
}
