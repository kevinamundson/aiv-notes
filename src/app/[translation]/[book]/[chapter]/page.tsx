import { ChapterReader } from "@/components/ChapterReader";
import { TranslationPicker } from "@/components/TranslationPicker";
import { auth, isAllowlistedLogin } from "@/lib/auth";
import {
  DEFAULT_BOOK,
  DEFAULT_CHAPTER,
  DEFAULT_TRANSLATION_ID,
} from "@/lib/constants";
import { fetchChapter, listEnglishTranslations } from "@/lib/scripture";
import { noteStoreBackend } from "@/lib/notes";

type Props = {
  params: Promise<{ translation: string; book: string; chapter: string }>;
};

export default async function ChapterPage({ params }: Props) {
  const { translation, book, chapter: chapterRaw } = await params;
  const translationId = (translation || DEFAULT_TRANSLATION_ID).toUpperCase();
  const bookId = (book || DEFAULT_BOOK).toUpperCase();
  const chapterNum = Number(chapterRaw) || DEFAULT_CHAPTER;

  const session = await auth();
  const login = (session?.user as { login?: string } | undefined)?.login;
  const canWrite = isAllowlistedLogin(login);

  let chapter;
  let error: string | null = null;
  try {
    chapter = await fetchChapter(translationId, bookId, chapterNum);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load chapter";
  }

  const translations = await listEnglishTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TranslationPicker
          items={translations}
          current={translationId}
          book={bookId}
          chapter={chapterNum}
        />
        <p className="text-xs opacity-60">
          Note store: {noteStoreBackend()} · read without sign-in; write needs allowlist
        </p>
      </div>

      {error || !chapter ? (
        <p className="text-sm text-red-800">{error ?? "Chapter unavailable"}</p>
      ) : (
        <ChapterReader chapter={chapter} canWrite={canWrite} />
      )}
    </div>
  );
}
