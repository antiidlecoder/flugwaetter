"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./message";

const SUGGESTED_QUESTIONS = [
  "Wie sieht's heute aus zum Fliegen?",
  "Föhn-Check bitte",
  "Welcher Spot ist gut heute?",
  "Modellvergleich Niesen",
  "Was meinst du zum Fiesch heute?",
];

export function Chat() {
  const { messages, status, sendMessage, stop } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (question: string) => {
    sendMessage({ text: question });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="text-2xl">🪂</div>
        <div>
          <h1 className="font-bold text-base leading-tight">Paragliding Wetterbot Schweiz</h1>
          <p className="text-xs text-gray-400">KI-Flugwetterberater · Open-Meteo · Holfuy</p>
        </div>
        {isLoading && (
          <div className="ml-auto flex items-center gap-2 text-xs text-sky-400">
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            Analysiere…
            <button
              onClick={stop}
              className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
              title="Abbrechen"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="text-5xl">🏔️</div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Hoi! Wie kann ich helfen?</h2>
              <p className="text-gray-400 text-sm max-w-xs">
                Frag mich nach dem Flugwetter, einem bestimmten Spot oder der aktuellen
                Grosswetterlage.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestion(q)}
                  className="bg-gray-800 hover:bg-gray-700 text-sm px-3 py-2 rounded-xl border border-gray-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0 mt-1">
                  ⛵
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </main>

      {/* Input */}
      <footer className="px-4 py-3 border-t border-gray-700 bg-gray-900">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag nach Wetter, Spots oder Föhn…"
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-gray-500"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors flex-shrink-0"
          >
            Senden
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          Immer eigene Einschätzung treffen · Sicherheit geht vor
        </p>
      </footer>
    </div>
  );
}
