export const DEFAULT_TRANSLATION_ID = "BSB";
export const DEFAULT_BOOK = "GEN";
export const DEFAULT_CHAPTER = 1;
export const HELLOAO_API_BASE = "https://bible.helloao.org/api";
export const NOTE_LABEL = "Kevin's comment (not Scripture)";

/** App policy: public visibility requires approved-by-kevin. */
export function assertPublicPolicy(status: string, visibility: string): void {
  if (visibility === "public" && status !== "approved-by-kevin") {
    throw new Error(
      "visibility public requires status approved-by-kevin (NOTES-CONTRACT policy)",
    );
  }
}
