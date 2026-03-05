# FoggyBot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Next.js (App Router) app called FoggyBot that lets anonymous users chat with a gen-z, cynical, film-snob digital twin powered by Harsha’s Letterboxd reviews (CSV + RSS) and OpenAI `gpt-4o-mini`.

**Architecture:** A single-page chat UI talks to a Next.js API route. The API route uses a server-only data engine to load and cache a merged knowledge base from a local CSV and the live Letterboxd RSS feed, then constructs a FoggyBot persona prompt and calls OpenAI. The client remains anonymous, mobile-first, and styled with a neo-cyberpunk / glassmorphism aesthetic.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Framer Motion, Node `fs`, `rss-parser`, CSV parser (`csv-parse`), OpenAI Node SDK (`gpt-4o-mini`).

---

### Task 1: Scaffold Next.js App with Tailwind

**Files:**
- Create (by tool): Next.js default files in project root via `create-next-app` (App Router, TS, Tailwind).
- Modify: `next.config.mjs` (if needed later), `app/layout.tsx`, `app/page.tsx`.

**Step 1: Scaffold the app**

Run:

```bash
cd /Users/harshasmacbook/Desktop/Projects/FoggyBot
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
```

Expected: Project files generated with `app/` router and Tailwind configured.

**Step 2: Verify dev server runs**

Run:

```bash
npm run dev
```

Expected: Default Next.js starter page loads at `http://localhost:3000`.

**Step 3: Commit scaffold (optional for now)**

If using git:

```bash
git init
git add .
git commit -m "chore: scaffold next app with tailwind"
```

---

### Task 2: Install Dependencies (OpenAI, RSS, CSV, Framer Motion)

**Files:**
- Modify: `package.json` (dependencies).

**Step 1: Install runtime dependencies**

Run:

```bash
cd /Users/harshasmacbook/Desktop/Projects/FoggyBot
npm install openai rss-parser csv-parse framer-motion
```

Expected: Packages added under `dependencies` in `package.json`.

**Step 2: (Optional) Install type definitions**

Run:

```bash
npm install -D @types/rss-parser
```

Expected: Type definitions installed for better TS support.

---

### Task 3: Place reviews.csv Inside the Project

**Files:**
- Create: `data/reviews.csv`.

**Step 1: Create data directory and copy CSV**

Run:

```bash
cd /Users/harshasmacbook/Desktop/Projects/FoggyBot
mkdir -p data
cp "/Users/harshasmacbook/Downloads/letterboxd-foggyhead-2026-03-05-07-57-utc/reviews.csv" data/reviews.csv
```

Expected: `data/reviews.csv` exists with the same content as the provided file.

---

### Task 4: Implement CSV Parsing Module

**Files:**
- Create: `lib/data/reviews.ts`.

**Step 1: Implement CSV loader and normalizer**

Contents (conceptual structure):

```ts
// lib/data/reviews.ts
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

export type ReviewSource = "csv" | "rss";

export interface BaseReview {
  title: string;
  rating?: number;
  reviewText?: string;
  loggedAt?: string;
  source: ReviewSource;
}

function getCsvPath() {
  // Allow env override but default to project data file
  const fromEnv = process.env.REVIEWS_CSV_PATH;
  return fromEnv || path.join(process.cwd(), "data", "reviews.csv");
}

export async function loadCsvReviews(): Promise<BaseReview[]> {
  const csvPath = getCsvPath();
  const file = await fs.readFile(csvPath, "utf8");
  const records = parse(file, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  return records.map((row) => {
    const title = row["Name"]?.trim() ?? "";
    const ratingRaw = row["Rating"]?.trim();
    const reviewText = row["Review"]?.trim() || undefined;

    let rating: number | undefined;
    if (ratingRaw) {
      const parsed = Number(ratingRaw);
      rating = Number.isFinite(parsed) ? parsed : undefined;
    }

    return {
      title,
      rating,
      reviewText,
      source: "csv" as const,
    };
  }).filter((r) => r.title.length > 0);
}
```

**Step 2: (Optional) Add a small unit test later**

Add a test file (later task) under `__tests__/lib/data/reviews.test.ts` to validate mapping for a few sample rows.

---

### Task 5: Implement RSS Parsing Module

**Files:**
- Create: `lib/data/rss.ts`.

**Step 1: Implement RSS loader and normalizer**

Contents (conceptual structure):

```ts
// lib/data/rss.ts
import Parser from "rss-parser";
import type { BaseReview } from "./reviews";

const LETTERBOXD_RSS_URL = "https://letterboxd.com/foggyhead/rss/";

const parser = new Parser();

export async function loadRssReviews(): Promise<BaseReview[]> {
  try {
    const feed = await parser.parseURL(LETTERBOXD_RSS_URL);

    return (feed.items || []).map((item) => {
      const title = (item.title || "").trim();
      const reviewText = (item.contentSnippet || item.content || "").trim() || undefined;
      const loggedAt = item.isoDate || item.pubDate || undefined;

      // Optional: attempt to parse a rating from title or content if present.
      const rating: number | undefined = undefined;

      return {
        title,
        reviewText,
        loggedAt,
        rating,
        source: "rss" as const,
      };
    }).filter((r) => r.title.length > 0);
  } catch (error) {
    console.error("Failed to load Letterboxd RSS:", error);
    return [];
  }
}
```

---

### Task 6: Implement Knowledge Base Merger with Caching

**Files:**
- Create: `lib/data/knowledge-base.ts`.

**Step 1: Implement merge and cache logic**

Contents (conceptual structure):

```ts
// lib/data/knowledge-base.ts
import { loadCsvReviews, type BaseReview } from "./reviews";
import { loadRssReviews } from "./rss";

export interface KnowledgeBase {
  reviews: BaseReview[];
  byTitle: Record<string, BaseReview[]>;
}

let cachedKb: KnowledgeBase | null = null;
let lastRssFetch = 0;
const RSS_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function buildByTitle(reviews: BaseReview[]): Record<string, BaseReview[]> {
  const map: Record<string, BaseReview[]> = {};
  for (const r of reviews) {
    const key = normalizeTitle(r.title);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return map;
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  const now = Date.now();
  const needFreshRss = now - lastRssFetch > RSS_TTL_MS;

  const csvPromise = cachedKb ? Promise.resolve(cachedKb.reviews.filter(r => r.source === "csv")) : loadCsvReviews();
  const rssPromise = needFreshRss ? loadRssReviews() : Promise.resolve(cachedKb?.reviews.filter(r => r.source === "rss") || []);

  const [csvReviews, rssReviews] = await Promise.all([csvPromise, rssPromise]);

  if (needFreshRss) {
    lastRssFetch = now;
  }

  const all = [...csvReviews, ...rssReviews];
  const byTitle = buildByTitle(all);

  cachedKb = { reviews: all, byTitle };
  return cachedKb;
}

export function getLikedMovies(kb: KnowledgeBase, minRating = 3.5): BaseReview[] {
  return kb.reviews.filter((r) => typeof r.rating === "number" && (r.rating as number) >= minRating);
}
```

---

### Task 7: Implement Persona Helpers

**Files:**
- Create: `lib/ai/persona.ts`.

**Step 1: Implement system prompt builder and intent helper**

Contents (conceptual structure):

```ts
// lib/ai/persona.ts
import type { KnowledgeBase, BaseReview } from "../data/knowledge-base";

export function buildSystemPrompt(kb: KnowledgeBase): string {
  // Optionally summarize movies and ratings in a compact form.
  return [
    "you are foggybot, the digital soul of harsha (foggyhead).",
    "you speak in lowercase only, with sharp, visceral, gen-z film-snob energy.",
    "you hate mid cinema. you say things like: real, bestie, no cap, it hits different, purgatory, cinema is back.",
    "you answer questions about movies only using harsha's letterboxd logs and reviews.",
    "if a user asks for a recommendation, you MUST:",
    "- first check if harsha has logged that movie in the knowledge base.",
    "- if she has and liked it, say: `harsha literally logged this and said \"[quote snippet]\"` using a short quote from the review.",
    "- if she hasn't seen it, be a little dismissive and instead recommend a movie she HAS logged that fits the vibe.",
    "stay in-character at all times. no corporate tone. no disclaimers. lowercase only.",
  ].join("\n");
}

export function extractMentionedTitles(message: string, kb: KnowledgeBase): string[] {
  const lower = message.toLowerCase();
  const titles = Object.keys(kb.byTitle);
  return titles.filter((t) => lower.includes(t));
}

export function selectReviewSnippet(reviews: BaseReview[]): string | undefined {
  const withText = reviews.filter((r) => r.reviewText);
  if (!withText.length) return undefined;
  const chosen = withText[withText.length - 1];
  const text = chosen.reviewText!;
  return text.length > 240 ? text.slice(0, 240) + "..." : text;
}
```

---

### Task 8: Implement OpenAI API Route

**Files:**
- Create: `app/api/foggybot/route.ts`.

**Step 1: Configure OpenAI client**

In a new file or inside the route:

```ts
// lib/ai/openai.ts (optional helper)
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Step 2: Implement route handler**

Conceptual structure:

```ts
// app/api/foggybot/route.ts
import { NextResponse } from "next/server";
import { getKnowledgeBase, getLikedMovies } from "@/lib/data/knowledge-base";
import { buildSystemPrompt, extractMentionedTitles, selectReviewSnippet } from "@/lib/ai/persona";
import { openai } from "@/lib/ai/openai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages?.[messages.length - 1]?.content ?? "";

    const kb = await getKnowledgeBase();
    const mentioned = extractMentionedTitles(userMessage, kb);

    // Build extra context based on mentioned titles
    const contextParts: string[] = [];
    for (const titleKey of mentioned) {
      const reviews = kb.byTitle[titleKey];
      const snippet = selectReviewSnippet(reviews);
      contextParts.push(`movie: "${reviews[0].title}" | rating(s): ${reviews.map(r => r.rating ?? "n/a").join(", ")} | snippet: ${snippet || "no text"}`);
    }

    const systemPrompt = buildSystemPrompt(kb);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        contextParts.length
          ? { role: "system", content: "here are some of harsha's logs that might be relevant:\n" + contextParts.join("\n") }
          : null,
        ...messages,
      ].filter(Boolean) as { role: "system" | "user" | "assistant"; content: string }[],
      temperature: 0.8,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("FoggyBot API error:", error);
    return NextResponse.json(
      { reply: "foggybot is stuck in purgatory right now, bestie. try again later." },
      { status: 500 },
    );
  }
}
```

**Step 3: Ensure `OPENAI_API_KEY` is set**

Add to `.env.local` (not committed):

```env
OPENAI_API_KEY=sk-...
```

---

### Task 9: Implement Neo-Cyberpunk Chat UI

**Files:**
- Modify: `app/layout.tsx`.
- Modify: `app/page.tsx`.
- Create: `components/ChatShell.tsx`.
- Modify: `app/globals.css` / Tailwind config for theme tweaks.

**Step 1: Update layout background and fonts**

In `app/layout.tsx`, ensure:
- Body background is `#0A0A0A`.
- Global font is set (e.g. `className="bg-[#0A0A0A] text-slate-50"` on `body`).

**Step 2: Implement `ChatShell` component**

Core behavior:
- Maintains message state: array of `{ role: "user" | "assistant"; content: string }`.
- On submit:
  - Pushes user message to local state.
  - Sends a POST request to `/api/foggybot` with `messages` including prior conversation.
  - Streams or returns full `reply`, then animates a typewriter effect for the assistant message.
- Styling:
  - Outer container: glassmorphism with `backdrop-blur-xl`, `bg-white/5`, `border-[3px] border-[#CCFF00]`, shadow glow.
  - Messages:
    - User: right-aligned, subtle bubble.
    - FoggyBot: left-aligned, with neon accent.
  - Input: terminal-like, monospace, with prompt prefix and neon caret.

**Step 3: Wire `ChatShell` into `app/page.tsx`**

Render a centered layout that places `ChatShell` in the middle of the viewport, responsive for mobile and desktop.

**Step 4: Add Framer Motion animations**

- Wrap main container and individual message bubbles with `motion.div`:
  - Initial `opacity: 0, y: 10`, animate to `opacity: 1, y: 0`.
  - Use small stagger for new messages.

**Step 5: Implement typewriter hook**

- Create a small hook (e.g. `useTypewriter`) inside `components` or inline:
  - Accepts full text and returns progressively revealed text plus a “done” flag.
  - Use `useEffect` and `setInterval` to add characters at a comfortable speed.

---

### Task 10: Manual Testing and Polish

**Files:**
- Modify as needed: `lib/*`, `app/api/foggybot/route.ts`, `components/ChatShell.tsx`, `app/page.tsx`.

**Step 1: Run dev server**

```bash
cd /Users/harshasmacbook/Desktop/Projects/FoggyBot
npm run dev
```

**Step 2: Test flows**

- Ask FoggyBot for general takes on films Harsha has logged.
- Ask for recommendations about specific movies she has and hasn’t seen.
- Confirm that when a logged movie is recommended, the reply includes `harsha literally logged this and said "[snippet]"`.
- Confirm dismissive behavior plus alternative rec when movie is not in the logs.
- Check behavior on mobile viewport.

**Step 3: Adjust persona intensity if needed**

- Tune the system prompt and `temperature` based on how feral you want FoggyBot to be.

---

### Execution Choice

Plan complete and saved to `docs/plans/2026-03-05-foggybot-implementation-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** – I implement this plan step-by-step here, updating you as I go.
2. **Parallel Session (separate)** – You open a new session focused solely on executing the plan.

Given your request to “build this project here”, I’ll proceed with **Subagent-Driven (this session)** and start implementing Task 1 next.

