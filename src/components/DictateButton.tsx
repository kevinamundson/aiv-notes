"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function DictateButton({ onTranscript, disabled }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setMessage(
        "Web Speech dictation is not available in this browser. Try Chrome/Edge, or type instead.",
      );
      return;
    }
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      const piece = ev.results?.[0]?.[0]?.transcript ?? "";
      if (piece) onTranscript(piece);
    };
    rec.onerror = (ev) => {
      setMessage(ev.error ? `Dictation error: ${ev.error}` : "Dictation error");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    setMessage(null);
    setListening(true);
    rec.start();
  }, [listening, onTranscript]);

  if (supported === false) {
    return (
      <p className="text-xs text-note-ink/70">
        Dictation unavailable (webkitSpeechRecognition not found). Type your note instead.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled || supported === null}
        onClick={toggle}
        className="rounded border border-note-rule px-2 py-1 text-xs text-note-ink hover:bg-note-rule/10 disabled:opacity-50"
      >
        {listening ? "Listening… (tap again to stop)" : "Dictate"}
      </button>
      {message ? <p className="text-xs text-note-ink/70">{message}</p> : null}
    </div>
  );
}
