import type { AIVNote, NoteCreateInput, NoteUpdateInput } from "@/types/note";

export interface NoteStore {
  getById(id: string): Promise<AIVNote | null>;
  listByVerse(verseId: string): Promise<AIVNote[]>;
  create(input: NoteCreateInput): Promise<AIVNote>;
  update(id: string, input: NoteUpdateInput): Promise<AIVNote>;
  delete(id: string): Promise<void>;
}
