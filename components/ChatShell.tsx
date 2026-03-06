'use client';

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageCircle, Sparkles } from "lucide-react";

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
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return displayed;
}

const MOODS = [
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
];

const PLACEHOLDERS = [
  "What did you think of Past Lives?",
  "Should I watch Dune 2?",
  "Recommend something for a lazy Sunday",
  "What's the vibe of Poor Things?",
  "Is this worth watching?",
  "Suggest something sad and beautiful",
  "What should I know before watching?",
  "Any hidden gems I might like?",
  "Thoughts on Anatomy of a Fall?",
  "Rec for when I want to feel something",
  "Did she like The Zone of Interest?",
  "Something niche but good",
  "What to avoid this weekend?",
  "Pick something for me",
  "Is Oppenheimer overhyped?",
  "Recommend based on my taste",
  "What's her take on this one?",
  "Something to cry to",
  "Good watch for tonight?",
  "Worth the hype or skip?",
  "Suggest something I wouldn't find on my own",
  "Quick opinion on this film",
  "What did foggyhead rate this?",
  "Rec for existential spiral mood",
  "Should I bother with this?",
  "Something raw and honest",
  "Best thing she's seen lately?",
  "What to expect from this movie?",
];

const PLACEHOLDER_INTERVAL_MS = 2500;

function getNextPlaceholderIndex(current: number, total: number): number {
  if (total <= 1) return 0;
  let next = Math.floor(Math.random() * total);
  while (next === current) {
    next = Math.floor(Math.random() * total);
  }
  return next;
}

export function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [showMoods, setShowMoods] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const moodPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoods) return;
    function handleClick(e: MouseEvent) {
      if (moodPanelRef.current && !moodPanelRef.current.contains(e.target as Node)) {
        setShowMoods(false);
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [showMoods]);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((p) =>
        getNextPlaceholderIndex(p, PLACEHOLDERS.length),
      );
    }, PLACEHOLDER_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const latestAssistant = typingMessageId
    ? messages.find((m) => m.role === "assistant" && m.id === typingMessageId)
    : undefined;
  const latestContent = latestAssistant?.content ?? "";
  const shouldType =
    latestAssistant &&
    latestContent.length > 0 &&
    latestContent.length <= 500;
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
      const res = await fetch("/api/foggybot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { reply?: string };
      const replyText =
        data.reply || "Something went wrong on my side. Try again in a bit.";

      const botMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
      };
      setMessages((prev) => [...prev, botMessage]);
      setTypingMessageId(botMessage.id);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Try again.",
        },
      ]);
      setTypingMessageId(null);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendPrompt(input);
  }

  function handleMoodClick(label: string) {
    sendPrompt(`mood: ${label.toLowerCase()}. what should i watch tonight?`);
    setShowMoods(false);
  }

  function getFilmFromContext(): string {
    const trimmed = input.trim();
    if (trimmed) return trimmed;
    const lastUser = messages.slice().reverse().find((m) => m.role === "user")?.content?.trim();
    return lastUser || "";
  }

  function handleQuick(
    command: "random" | "forme" | "peak" | "hertake",
  ) {
    const film = getFilmFromContext();

    if (command === "random")
      sendPrompt("surprise me with a random foggyhead pick.");
    else if (command === "forme")
      sendPrompt("rec me something — based on what I've asked or what you think I'd like.");
    else if (command === "peak") {
      if (!film) {
        sendPrompt("is it even peak? which film? (ask me)");
        return;
      }
      sendPrompt(`is "${film}" even peak or just overhyped? honest take.`);
    } else if (command === "hertake") {
      if (!film) {
        sendPrompt("what's her take? which film? (ask me)");
        return;
      }
      sendPrompt(`what's foggyhead's take on "${film}"?`);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 sm:py-5 md:py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl backdrop-blur-sm sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 overflow-hidden">
              <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">
                FoggyBot
              </h1>
              <span className="shrink-0 text-[10px] font-medium tracking-wide text-rose-300/80 sm:text-[11px]">
                letterboxd brain
              </span>
            </div>
          </div>
        </header>

        {/* Shortcuts */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-white/5 px-3 py-2 sm:px-5 sm:py-2.5">
          <span className="text-[11px] text-neutral-500">Quick ask:</span>
          {[
            { label: "Surprise me", cmd: "random" as const },
            { label: "Is it peak?", cmd: "peak" as const },
            { label: "Rec me", cmd: "forme" as const },
            { label: "Her take?", cmd: "hertake" as const },
          ].map(({ label, cmd }) => (
            <button
              key={cmd}
              type="button"
              onClick={() => handleQuick(cmd)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-neutral-300 transition hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-200"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className="scrollbar-invisible flex min-h-[320px] flex-1 flex-col overflow-y-auto p-4 sm:p-5">
          <AnimatePresence initial={false}>
            {!hasMessages && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-auto max-w-xl rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-5 text-center text-sm text-neutral-400 sm:px-5 sm:py-6"
              >
                <p className="leading-relaxed">
                  Wondering if that film edit you saw on the ’gram or the insane fit
                  someone pulled off in it — is actually worth the hype or just a
                  high-budget vacuum? Ask about a director, query a movie, or pick
                  a mood and see what foggyhead thinks.
                </p>
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`min-w-0 max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:px-4 ${
                      isUser
                        ? "bg-rose-500/20 text-rose-50"
                        : "border border-white/10 bg-white/[0.04] text-neutral-200"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{displayContent}</p>
                  </div>
                </motion.div>
              );
            })}

            {isSending && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-neutral-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                  Thinking…
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="relative shrink-0 border-t border-white/10 p-2 sm:p-4"
        >
          <div className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-1.5 focus-within:border-rose-400/30 focus-within:ring-1 focus-within:ring-rose-400/20 sm:gap-2 sm:px-3 sm:py-2">
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              placeholder={PLACEHOLDERS[placeholderIndex]}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
            />
            <div className="relative flex shrink-0 items-center gap-1" ref={moodPanelRef}>
              <button
                type="button"
                onClick={() => setShowMoods((s) => !s)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-neutral-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 sm:px-2.5 sm:text-[11px]"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>By mood</span>
                <ChevronDown
                  className={`h-3 w-3 shrink-0 transition-transform ${showMoods ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {showMoods && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute right-0 bottom-full z-20 mb-2 w-[min(100%,260px)]"
                  >
                    <div className="scrollbar-invisible max-h-[min(220px,45vh)] overflow-y-auto rounded-xl border border-white/10 bg-black/25 py-2 shadow-lg backdrop-blur-xl">
                      <ul className="flex flex-col gap-0.5 px-1 py-1">
                        {MOODS.map((mood) => (
                          <li key={mood}>
                            <button
                              type="button"
                              onClick={() => handleMoodClick(mood)}
                              className="w-full rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-neutral-200 transition hover:bg-rose-500/20 hover:text-rose-100"
                            >
                              {mood}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              disabled={isSending}
              className="shrink-0 rounded-xl bg-rose-500/25 px-2.5 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-500/35 disabled:opacity-50 sm:px-3"
            >
              {isSending ? "…" : "Send"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
