'use client';

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

function useTypewriter(text: string, speed = 8) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayed("");
      return;
    }

    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
      }
    }, speed);

    return () => clearInterval(id);
  }, [text, speed]);

  return displayed;
}

export function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState("FOG-0000");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "ask foggyhead about a film...",
    "drop a film title...",
    "roast foggyhead's taste...",
    "ask for a recommendation...",
  ];

  useEffect(() => {
    const n = Math.floor(1000 + Math.random() * 9000);
    setSessionId(`FOG-${n}`);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const latestAssistant = (() => {
    if (!typingMessageId) return undefined;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === "assistant" && m.id === typingMessageId) return m;
    }
    return undefined;
  })();

  const latestContent = latestAssistant?.content ?? "";
  const shouldType =
    latestAssistant && latestContent.length > 0 && latestContent.length <= 500;

  const typedText = useTypewriter(shouldType ? latestContent : "", 10);

  async function sendPrompt(raw: string) {
    const content = raw.trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const history = [...messages, userMessage].slice(-8);
      const payload = {
        messages: history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const res = await fetch("/api/foggybot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { reply?: string };
      const replyText =
        data.reply ||
        "foggybot is in purgatory right now, bestie. the api did not vibe.";

      const botMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
      };

      setMessages((prev) => [...prev, botMessage]);
      setTypingMessageId(botMessage.id);
    } catch {
      const botMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "something broke on the way to the cinema servers, bestie. try again.",
      };
      setMessages((prev) => [...prev, botMessage]);
      setTypingMessageId(botMessage.id);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    await sendPrompt(input);
  }

  async function handleMoodClick(label: string) {
    await sendPrompt(`mood: ${label.toLowerCase()}. what should i watch tonight?`);
  }

  async function handleQuickCommand(
    command: "stats" | "avoid" | "random" | "roast" | "watched",
  ) {
    if (command === "stats") {
      await sendPrompt("show me foggyhead's taste stats.");
    } else if (command === "avoid") {
      await sendPrompt("avoid something. what movies should i not watch?");
    } else if (command === "random") {
      await sendPrompt("surprise me with a random foggyhead pick.");
    } else if (command === "roast") {
      await sendPrompt("roast my taste based on what i've asked so far.");
    } else if (command === "watched") {
      const trimmed = input.trim();
      const lastUser = [...messages]
        .reverse()
        .find((m) => m.role === "user")?.content;
      const film = trimmed || lastUser || "";
      if (!film) {
        await sendPrompt(
          "foggyhead watched this. the user didn't type a title, so ask them which film they mean.",
        );
        return;
      }
      await sendPrompt(
        `foggyhead watched this: "${film}". answer in the exact format: foggyhead log:\\n\\nfilm: [title]\\nrating: [stars]\\nmood: [short mood tag]\\nnote: [one-line opinion]. keep everything in lowercase.`,
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(204,255,0,0.16),_transparent_60%)] px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border-[3px] border-[#CCFF00] bg-white/5 p-4 text-sm shadow-[0_0_32px_rgba(204,255,0,0.3)] backdrop-blur-2xl sm:p-6"
      >
        <header className="mb-3 flex flex-col gap-1 text-xs uppercase tracking-[0.22em] text-neutral-300">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.9)]" />
            foggybot // letterboxd brain
          </div>
          <div className="text-[10px] font-mono text-neutral-500">
            {sessionId} • anonymous session • cinema archive synced...
          </div>
        </header>

        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-2 text-[10px] text-neutral-400">
            <span className="uppercase tracking-[0.2em] text-neutral-500">
              mood check:
            </span>
            {[
              "existential spiral",
              "quiet loneliness",
              "cinematic beauty",
              "chaos energy",
              "soft heartbreak",
              "brain rot cinema",
              "body horror",
              "emotional terrorism",
              "psychological damage",
              "main character syndrome",
              "girly cinema",
            ].map((mood) => (
              <motion.button
                key={mood}
                type="button"
                onClick={() => handleMoodClick(mood)}
                whileHover={{ scale: 1.05 }}
                className="cursor-pointer rounded-full border border-[#CCFF00]/40 bg-black/50 px-3 py-1 font-mono text-[10px] lowercase text-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.25)] transition hover:border-[#CCFF00] hover:bg-black/70 hover:shadow-[0_0_14px_rgba(204,255,0,0.5)]"
              >
                {mood}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
            <span className="whitespace-nowrap uppercase tracking-[0.2em] text-neutral-500">
              shortcuts:
            </span>
            <div className="scrollbar-invisible flex max-w-full flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
              <button
              type="button"
              onClick={() => handleQuickCommand("random")}
              className="rounded-full border border-neutral-700 bg-black/60 px-3 py-1 font-mono text-[10px] lowercase text-neutral-200 transition hover:border-[#CCFF00] hover:text-[#CCFF00]"
            >
              surprise me
            </button>
              <button
              type="button"
              onClick={() => handleQuickCommand("stats")}
              className="rounded-full border border-neutral-700 bg-black/60 px-3 py-1 font-mono text-[10px] lowercase text-neutral-200 transition hover:border-[#CCFF00] hover:text-[#CCFF00]"
            >
              taste stats
            </button>
              <button
              type="button"
              onClick={() => handleQuickCommand("avoid")}
              className="rounded-full border border-neutral-700 bg-black/60 px-3 py-1 font-mono text-[10px] lowercase text-neutral-200 transition hover:border-[#CCFF00] hover:text-[#CCFF00]"
            >
              do not watch
            </button>
              <button
              type="button"
              onClick={() => handleQuickCommand("roast")}
              className="rounded-full border border-neutral-700 bg-black/60 px-3 py-1 font-mono text-[10px] lowercase text-neutral-200 transition hover:border-[#CCFF00] hover:text-[#CCFF00]"
            >
              roast my taste
            </button>
              <button
              type="button"
              onClick={() => handleQuickCommand("watched")}
              className="rounded-full border border-neutral-700 bg-black/60 px-3 py-1 font-mono text-[10px] lowercase text-neutral-200 transition hover:border-[#CCFF00] hover:text-[#CCFF00]"
            >
              foggyhead watched this
            </button>
            </div>
          </div>
        </div>

        <div className="scrollbar-soft flex-1 overflow-y-auto rounded-2xl bg-black/40 p-3 sm:p-4">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-xs text-neutral-400"
              >
                say hi. ask what foggyhead thought about a film. ask for a rec.{" "}
                <span className="text-[#CCFF00]">
                  taste is subjective. foggyhead still has opinions.
                </span>
              </motion.div>
            )}

            {messages.map((m) => {
              const isUser = m.role === "user";
              const isTypingTarget = m.id === typingMessageId;
              const displayContent =
                isTypingTarget && shouldType && latestAssistant
                  ? typedText
                  : m.content;

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-3 text-xs sm:text-sm ${
                      isUser
                        ? "bg-[#CCFF00] text-black"
                        : "border-l-2 border-[#CCFF00] bg-white/5 text-neutral-100"
                    }`}
                  >
                    {!isUser && (
                      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-[#CCFF00]">
                        foggybot
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-[1.6]">
                      {displayContent}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {isSending && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 flex justify-start"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] text-neutral-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CCFF00]" />
                  <span>foggybot is typing…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-neutral-800 bg-black/60 px-3 py-2 text-xs text-neutral-200"
        >
          <span className="hidden select-none font-mono text-[#CCFF00] sm:inline">
            foggybot&gt;
          </span>
          <span className="inline select-none font-mono text-[#CCFF00] sm:hidden">
            &gt;
          </span>
          <input
            className="ml-1 flex-1 bg-transparent font-mono text-xs text-neutral-100 outline-none placeholder:text-neutral-600"
            placeholder={placeholders[placeholderIndex]}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
          />
          <motion.button
            type="submit"
            disabled={isSending}
            whileHover={{ scale: isSending ? 1 : 1.03 }}
            whileTap={{ scale: isSending ? 1 : 0.97 }}
            className="rounded-full border border-[#CCFF00]/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#CCFF00] disabled:opacity-40"
          >
            {isSending ? "thinking..." : "send"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

