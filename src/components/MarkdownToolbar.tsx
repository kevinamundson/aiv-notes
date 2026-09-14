"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Default scripture cite token for insert (e.g. GEN.1.1). */
  defaultCite?: string;
  disabled?: boolean;
};

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): { next: string; selStart: number; selEnd: number } {
  const selected = value.slice(start, end) || "text";
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    next,
    selStart: start + before.length,
    selEnd: start + before.length + selected.length,
  };
}

/**
 * Bezalel M2 toolbar — notes surface only, below never-Scripture label.
 * Bold **…**, Italic *…*, scripture-ref [[GEN.1.1]], https markdown links.
 */
export function MarkdownToolbar({
  value,
  onChange,
  textareaRef,
  defaultCite = "GEN.1.1",
  disabled,
}: Props) {
  const linkPrompted = useRef(false);

  function apply(mutator: (start: number, end: number) => ReturnType<typeof wrapSelection> | null) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const result = mutator(start, end);
    if (!result) return;
    onChange(result.next);
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus();
      t.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  const btn =
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-note-rule/40 bg-[#F0EBE3] px-2 font-note text-sm text-note-ink/80 hover:border-note-rule hover:text-note-ink disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]";

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-1 border-b border-note-rule/40 pb-2"
      role="toolbar"
      aria-label="Note markdown formatting"
    >
      <button
        type="button"
        className={btn}
        disabled={disabled}
        title="Bold"
        aria-label="Bold"
        onClick={() =>
          apply((s, e) => wrapSelection(value, s, e, "**", "**"))
        }
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled}
        title="Italic"
        aria-label="Italic"
        onClick={() =>
          apply((s, e) => wrapSelection(value, s, e, "*", "*"))
        }
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled}
        title="Insert scripture cite (excerpt token only)"
        aria-label="Insert scripture reference"
        onClick={() => {
          const cite = window.prompt(
            "Scripture cite token (USFM verseId, excerpt only — does not change attachment range)",
            defaultCite,
          );
          if (!cite?.trim()) return;
          const token = `[[${cite.trim().replace(/^\[\[|\]\]$/g, "")}]]`;
          apply((s, e) => {
            const next = value.slice(0, s) + token + value.slice(e);
            return { next, selStart: s + token.length, selEnd: s + token.length };
          });
        }}
      >
        Ref
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled}
        title="Insert https link"
        aria-label="Insert link"
        onClick={() => {
          if (linkPrompted.current) return;
          const url = window.prompt("https URL only", "https://");
          if (!url) return;
          if (!/^https:\/\//i.test(url) && !/^http:\/\//i.test(url)) {
            window.alert("External links must be http(s) only.");
            return;
          }
          if (/^javascript:/i.test(url)) {
            window.alert("javascript: URLs are not allowed.");
            return;
          }
          const label = window.prompt("Link label", "link") || "link";
          apply((s, e) => {
            const selected = value.slice(s, e) || label;
            const md = `[${selected}](${url})`;
            const next = value.slice(0, s) + md + value.slice(e);
            return { next, selStart: s, selEnd: s + md.length };
          });
        }}
      >
        Link
      </button>
    </div>
  );
}
