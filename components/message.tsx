"use client";

import type { UIMessage } from "ai";
import { isToolUIPart, isTextUIPart } from "ai";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <Image src="/android-chrome-192x192.png" alt="Bot" width={32} height={32} className="rounded-full mr-2 flex-shrink-0 mt-1" />
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-sky-600 text-white rounded-br-sm"
            : "bg-gray-800 text-gray-100 rounded-bl-sm"
        }`}
      >
        {message.parts.map((part, i) => {
          if (isTextUIPart(part)) {
            if (isUser) {
              return (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              );
            }
            return (
              <ReactMarkdown
                key={i}
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="leading-snug">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => <code className="bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-gray-700 rounded p-2 my-2 overflow-x-auto text-xs">{children}</pre>,
                  hr: () => <hr className="border-gray-600 my-2" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="text-xs border-collapse w-full">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="border-b border-gray-600">{children}</thead>,
                  th: ({ children }) => <th className="text-left py-1 pr-3 font-semibold text-gray-300">{children}</th>,
                  td: ({ children }) => <td className="py-0.5 pr-3 border-b border-gray-700">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-sky-500 pl-3 my-2 text-gray-400">{children}</blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">
                      {children}
                    </a>
                  ),
                }}
              >
                {part.text}
              </ReactMarkdown>
            );
          }
          if (isToolUIPart(part)) {
            const isRunning = part.state === "input-streaming" || part.state === "input-available";
            const toolName = part.type.replace(/^tool-/, "").replace(/_/g, " ");
            return (
              <div key={i} className={`mt-2 text-xs italic ${isRunning ? "text-sky-400" : "text-gray-500"}`}>
                {isRunning ? "🔧" : "✓"} {toolName}
                {isRunning ? "…" : ""}
              </div>
            );
          }
          return null;
        })}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-bold ml-2 flex-shrink-0 mt-1">
          👤
        </div>
      )}
    </div>
  );
}
