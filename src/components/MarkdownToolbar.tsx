"use client";

import { useEffect, useRef, useState } from "react";

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
 * M3 toolbar — Bold + Italic primary; scripture-ref + link behind Insert…
 * Notes surface only; never over Scripture.
 */
export function MarkdownToolbar({
  value,
  onChange,
  textareaRef,
  defaultCite = "GEN.1.1",
  disabled,
}: Props) {
  const [insertOpen, setInsertOpen] = useState(false);
  const insertRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!insertOpen) return;
    function onDoc(e: MouseEvent) {
      if (!insertRef.current?.contains(e.target as Node)) setInsertOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setInsertOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [insertOpen]);

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

  function insertRefCite() {
    setInsertOpen(false);
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
  }

  function insertLink() {
    setInsertOpen(false);
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
  }

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
        onClick={() => apply((s, e) => wrapSelection(value, s, e, "**", "**"))}
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled}
        title="Italic"
        aria-label="Italic"
        onClick={() => apply((s, e) => wrapSelection(value, s, e, "*", "*"))}
      >
        <span className="italic">I</span>
      </button>

      <div className="relative" ref={insertRef}>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          title="Insert…"
          aria-label="Insert"
          aria-expanded={insertOpen}
          aria-haspopup="menu"
          onClick={() => setInsertOpen((o) => !o)}
        >
          Insert…
        </button>
        {insertOpen ? (
          <div
            role="menu"
            className="absolute left-0 z-20 mt-1 min-w-[10rem] rounded border border-note-rule/40 bg-parchment py-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left font-note text-sm text-note-ink/90 hover:bg-[#F0EBE3]"
              onClick={insertRefCite}
            >
              Scripture ref
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left font-note text-sm text-note-ink/90 hover:bg-[#F0EBE3]"
              onClick={insertLink}
            >
              External link
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
