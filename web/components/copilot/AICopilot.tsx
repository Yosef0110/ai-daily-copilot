"use client";

import { FormEvent, useState } from "react";
import {
  Bot,
  Maximize2,
  Minimize2,
  Send,
  X,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya AI Copilot. Tanyakan tentang penjualan, inventory, produk, atau kondisi bisnis Anda.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function closeCopilot() {
    setIsOpen(false);
    setIsExpanded(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const question = input.trim();

    if (!question || isLoading) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ??
            result.message ??
            "AI Copilot gagal memberikan jawaban",
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.data.message,
        },
      ]);
    } catch (error) {
      console.error(
        "Failed to send Copilot message:",
        error,
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Maaf, AI Copilot belum dapat memproses pertanyaan tersebut.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================
  // MINIMIZED
  // ============================================================

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Buka AI Copilot"
        className="
          fixed bottom-6 right-6 z-50
          flex h-14 w-14
          items-center justify-center
          rounded-full
          bg-blue-600 text-white
          shadow-lg
          transition
          hover:scale-105 hover:bg-blue-700
        "
      >
        <Bot size={25} />
      </button>
    );
  }

  // ============================================================
  // CHAT
  // ============================================================

  return (
    <section
      className={`
        fixed z-50 flex flex-col
        overflow-hidden
        border border-slate-200
        bg-white
        shadow-2xl
        transition-all
        duration-200

        ${
          isExpanded
            ? `
              bottom-0 right-0 top-0
              w-full
              sm:w-[480px]
              lg:w-[520px]
            `
            : `
              bottom-6 right-6
              h-[560px]
              w-[390px]
              max-w-[calc(100vw-48px)]
              rounded-2xl
            `
        }
      `}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Bot
              size={20}
              className="text-blue-600"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              AI Copilot
            </h2>

            <p className="text-xs text-slate-500">
              Business Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* EXPAND / SHRINK */}

          <button
            type="button"
            onClick={() =>
              setIsExpanded((current) => !current)
            }
            aria-label={
              isExpanded
                ? "Perkecil AI Copilot"
                : "Perbesar AI Copilot"
            }
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {isExpanded ? (
              <Minimize2 size={17} />
            ) : (
              <Maximize2 size={17} />
            )}
          </button>

          {/* CLOSE */}

          <button
            type="button"
            onClick={closeCopilot}
            aria-label="Tutup AI Copilot"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => {
          const isUser =
            message.role === "user";

          return (
            <div
              key={index}
              className={`flex ${
                isUser
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`
                  max-w-[85%]
                  rounded-2xl
                  px-4 py-3
                  text-sm
                  leading-6

                  ${
                    isUser
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md bg-slate-100 text-slate-700"
                  }
                `}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500">
              Menganalisis data bisnis...
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          SUGGESTED QUESTIONS
      ====================================================== */}

      {messages.length === 1 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-2 text-xs text-slate-400">
            Coba tanyakan
          </p>

          <div className="flex flex-wrap gap-2">
            <Suggestion
              text="Produk paling laku?"
              onClick={setInput}
            />

            <Suggestion
              text="Stok yang menipis?"
              onClick={setInput}
            />

            <Suggestion
              text="Penjualan minggu ini?"
              onClick={setInput}
            />
          </div>
        </div>
      )}

      {/* ======================================================
          INPUT
      ====================================================== */}

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 p-4"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();

                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            disabled={isLoading}
            placeholder="Tanyakan tentang bisnis Anda..."
            className="
              max-h-32
              min-h-11
              flex-1
              resize-none
              rounded-xl
              border border-slate-200
              bg-slate-50
              px-3 py-3
              text-sm text-slate-900
              outline-none
              transition
              focus:border-blue-400
              focus:bg-white
              focus:ring-2
              focus:ring-blue-100
            "
          />

          <button
            type="submit"
            disabled={
              isLoading || !input.trim()
            }
            aria-label="Kirim pesan"
            className="
              flex h-11 w-11
              shrink-0
              items-center justify-center
              rounded-xl
              bg-blue-600
              text-white
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:bg-slate-300
            "
          >
            <Send size={17} />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-slate-400">
          AI dapat membuat kesalahan. Periksa kembali informasi penting.
        </p>
      </form>
    </section>
  );
}

// ============================================================
// SUGGESTION
// ============================================================

function Suggestion({
  text,
  onClick,
}: {
  text: string;
  onClick: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="
        rounded-full
        border border-slate-200
        px-3 py-1.5
        text-xs text-slate-600
        transition
        hover:border-blue-300
        hover:bg-blue-50
        hover:text-blue-700
      "
    >
      {text}
    </button>
  );
}