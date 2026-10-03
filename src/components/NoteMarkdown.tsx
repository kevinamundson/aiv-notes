"use client";

import type { ReactNode } from "react";

/**
 * Lightweight markdown display for note body.
 * Supports **bold**, *italic*, [label](https://...), [[GEN.1.1]], GEN 1:1–3.
 * In-body refs do not rewrite attachment range.
 */

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\[\[([A-Z0-9]{3}\.\d+\.\d+)\]\])|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\b([A-Z0-9]{3})\s+(\d+):(\d+)(?:[–-](\d+))?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(
        <span
          key={key++}
          className="rounded bg-note-rule/15 px-1 font-note text-[0.85em] text-note-ink"
          title="In-body scripture cite (not attachment range)"
        >
          {m[2]}
        </span>,
      );
    } else if (m[3]) {
      nodes.push(
        <a
          key={key++}
          href={m[5]}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-note-rule/60"
        >
          {m[4]}
        </a>,
      );
    } else if (m[6]) {
      nodes.push(<strong key={key++}>{m[7]}</strong>);
    } else if (m[8]) {
      nodes.push(<em key={key++}>{m[9]}</em>);
    } else if (m[10]) {
      const book = m[11];
      const ch = m[12];
      const v1 = m[13];
      const v2 = m[14];
      const label = v2 ? `${book} ${ch}:${v1}–${v2}` : `${book} ${ch}:${v1}`;
      nodes.push(
        <span
          key={key++}
          className="rounded bg-note-rule/15 px-1 font-note text-[0.85em] text-note-ink"
          title="In-body scripture cite (not attachment range)"
        >
          {label}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function NoteMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 whitespace-pre-wrap text-sm leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
}
