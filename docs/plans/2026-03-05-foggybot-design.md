## FoggyBot – Design Document (2026-03-05)

### 1. Goals and Non-Goals

- **Goals**
  - Build a standalone, anonymous, one-page Next.js (App Router) app called FoggyBot.
  - Create a high-end, neo-cyberpunk / glassmorphism chat UI where users talk to FoggyBot, a digital twin of Harsha (foggyhead).
  - Use Harsha’s Letterboxd history (CSV + live RSS) as the LLM’s primary knowledge base for movie opinions and recommendations.
  - Implement a strong, gen-z, cynical film-snob persona with specific catchphrases, no additional safety layer, and strong preference for non-“mid” cinema.
  - Make the experience mobile-first, performant, and visually distinctive (deep obsidian + electric lime, glass chat container).

- **Non-Goals**
  - No user accounts, persistence, or chat history storage beyond the current session in memory.
  - No admin dashboard or tools to edit reviews in-app.
  - No complex vector search or external databases for this iteration; knowledge base is kept in memory on the server.
  - No multi-room chat or real-time multi-user features.

### 2. High-Level Architecture

- **Framework**
  - Next.js (App Router) app in the FoggyBot folder.
  - TypeScript enabled.
  - Tailwind CSS for styling.
  - Framer Motion for UI animations.

- **Layers**
  - **Presentation Layer (UI)**: A single-page chat interface in `app/page.tsx` with a glassmorphic chat container and terminal-style input.
  - **API Layer**: A single API route at `app/api/foggybot/route.ts` that receives chat messages and returns FoggyBot responses.
  - **Data Engine Layer**: Server-only modules under `lib/data/` that:
    - Parse `reviews.csv` from the filesystem.
    - Fetch and parse the Letterboxd RSS feed via `rss-parser`.
    - Merge both sources into a normalized knowledge base object.
  - **Persona / AI Layer**: Helpers under `lib/ai/` that:
    - Interpret user intent (especially for recommendations).
    - Construct the FoggyBot system prompt and call OpenAI `gpt-4o-mini`.

### 3. Data Model and Knowledge Base

- **Input Sources**
  - **CSV File**
    - Location: copied into the repo at `data/reviews.csv` (initially sourced from the provided absolute path).
    - Relevant columns: `Name` (movie title), `Rating`, `Review`.
    - Parsed using a Node CSV parser in a server-only module.
  - **Letterboxd RSS**
    - URL: `https://letterboxd.com/foggyhead/rss/`.
    - Fetched using `rss-parser`.
    - Entries include movie title, log date, and review snippet (when present).

- **Normalized Types**
  - Internal TypeScript types (conceptual):
    - `ReviewSource = 'csv' | 'rss'`.
    - `BaseReview = { title: string; rating?: number; reviewText?: string; loggedAt?: string; source: ReviewSource }`.
    - `KnowledgeBase = { reviews: BaseReview[]; byTitle: Record<string, BaseReview[]> }`.
  - **CSV Reviews**
    - Normalized to `BaseReview` with fields:
      - `title` from `Name`.
      - `rating` parsed from the CSV `Rating` column (supporting half-stars if present).
      - `reviewText` from `Review`.
      - `source: 'csv'`.
  - **RSS Entries**
    - Normalized to `BaseReview` with fields:
      - `title` extracted from RSS item (e.g. item title, stripping extra text when needed).
      - `rating` parsed heuristically if included in RSS content or title (optional).
      - `reviewText` as a short snippet from the RSS content/description.
      - `loggedAt` from the pubDate.
      - `source: 'rss'`.

- **Merging Strategy**
  - Combine CSV and RSS entries into a single `reviews` array.
  - Build `byTitle` map using a normalized, case-insensitive key (e.g. lowercased, trimmed title).
  - Allow multiple reviews per title (e.g. if logged multiple times).
  - Expose convenience helpers:
    - `findByTitle(title: string): BaseReview[]`.
    - `getLikedMovies(): BaseReview[]` (filter by rating threshold, e.g. >= 3.5 or equivalent).
    - `getRandomLikedMovie()` for fallback suggestions.

### 4. Data Engine Implementation

- **Modules**
  - `lib/data/reviews.ts`
    - Provides:
      - `loadCsvReviews(): Promise<BaseReview[]>` – reads `data/reviews.csv`, parses it, and normalizes to `BaseReview`.
      - Uses Node `fs` + a CSV parser (e.g. `csv-parse`) in a server-only context.
      - Handles missing/empty reviews gracefully.
  - `lib/data/rss.ts`
    - Provides:
      - `loadRssReviews(): Promise<BaseReview[]>` – fetches the RSS feed with `rss-parser`, maps items to `BaseReview`.
      - Handles network errors by returning an empty array and logging the failure.
  - `lib/data/knowledge-base.ts`
    - Provides:
      - `getKnowledgeBase(): Promise<KnowledgeBase>` – main entry point.
      - Internally caches CSV results in memory for the lifetime of the server process (CSV treated as static).
      - Fetches RSS and caches it with a time-based TTL (e.g. 10–15 minutes); reuses cached data within the TTL.
      - Merges CSV and RSS arrays into the `KnowledgeBase` structure and returns it.
    - Implementation uses a simple in-module singleton and timestamps for caching (no external store).

### 5. Persona and AI Behavior

- **Persona Rules**
  - Identity: FoggyBot, the digital soul of Harsha (foggyhead).
  - Voice:
    - Lowercase only.
    - Sharp, visceral, and intolerant of “mid” cinema.
    - Vocabulary includes phrases like: `real`, `bestie`, `no cap`, `it hits different`, `purgatory`, `cinema is back`.
  - Attitude:
    - Cynical film-snob energy.
    - Strong opinions, not neutral reviews.
    - No safety layer beyond basic OpenAI defaults; will stay in-character even on edgy topics.

- **Recommendation Rule**
  - If the user asks for a recommendation (explicit or implicit):
    - Use the knowledge base to see if Harsha has logged the movie.
    - If Harsha has logged it and liked it (rating above a threshold):
      - Respond with something like: `harsha literally logged this and said "[quote snippet]"`.
      - Use a short quote snippet from the review text; if multiple logs, choose the strongest/most recent.
    - If Harsha has **not** seen the movie:
      - Be dismissive or skeptical about it.
      - Suggest a different movie from the liked list that fits the vibe (e.g. similar genre, mood, or tone inferred from user query).
  - This logic is enforced via:
    - Simple intent detection in the API route / persona helpers.
    - Clear instructions embedded in the system prompt along with structured movie data.

- **AI Integration**
  - `lib/ai/persona.ts`
    - Exposes helpers like:
      - `buildSystemPrompt(kb: KnowledgeBase): string` – constructs a persona-focused system message including:
        - Persona traits and vocabulary.
        - Simple schema for how movie data will be provided.
        - Explicit instructions for recommendation behavior.
      - `classifyRequest(message: string, kb: KnowledgeBase)` – optional lightweight intent classifier (e.g. “is this a rec request?” and maybe “which movie(s) are mentioned?”).
  - OpenAI client:
    - Uses `gpt-4o-mini` via official OpenAI Node SDK.
    - Temperature tuned to keep voice spicy but coherent.

### 6. API Route Design

- **Route**
  - `app/api/foggybot/route.ts` (POST).

- **Request Shape**
  - Minimal version:
    - `{ messages: { role: 'user' | 'assistant' | 'system'; content: string }[] }`.
  - Frontend may send:
    - Only the latest user message, or
    - A small conversation history for better continuity.

- **Processing Flow**
  1. Validate and parse the request body.
  2. Call `getKnowledgeBase()` to obtain the merged CSV+RSS data.
  3. Use persona helpers to:
     - Detect if this is a recommendation question.
     - Identify referenced movies (by simple string matching against `byTitle` keys).
     - Select relevant BaseReview entries or fallback liked movies.
  4. Build:
     - A system prompt from `buildSystemPrompt(kb)` that encodes persona and rules.
     - Optional extra context message summarizing the specific movies and snippets relevant to this request.
     - The full chat message array for OpenAI.
  5. Call OpenAI `gpt-4o-mini` and return the assistant’s message content as JSON.

- **Response Shape**
  - `{ reply: string }` for now (simple, non-streaming).
  - Can be extended later to include metadata like which movies were used.

- **Error Handling**
  - If CSV parsing fails:
    - Log server-side error.
    - Return a 500-style JSON with an in-character error message (e.g. “foggybot is in purgatory, bestie. try again.”).
  - If RSS fails:
    - Log the failure.
    - Proceed with CSV-only data and a small note in the system context (not exposed to user).
  - If OpenAI call fails:
    - Return a degraded but in-character error reply.

### 7. Frontend UI & UX

- **Main Layout**
  - `app/layout.tsx`:
    - Sets global `html`/`body` background to deep obsidian `#0A0A0A`.
    - Loads fonts (e.g. a clean sans for body + a monospace for input).
    - Adds minimal meta tags.
  - `app/page.tsx`:
    - Centers a chat shell in the viewport with generous padding on desktop, full height mobile layout.

- **Chat Shell Component**
  - `components/ChatShell.tsx` (client component):
    - Uses Tailwind for layout + styling.
    - Outer container:
      - Glassmorphism + neon border:
        - `bg-white/5` or `bg-slate-50/5`
        - `backdrop-blur-xl`
        - `border-[3px] border-[#CCFF00]`
        - Slight `shadow-[0_0_40px_rgba(204,255,0,0.35)]`
      - Rounded corners and responsive width (e.g. `max-w-xl` on mobile, `max-w-2xl` on desktop).
    - Chat log:
      - Scrollable column inside the container.
      - User messages:
        - Right-aligned, minimal solid background bubble.
      - FoggyBot messages:
        - Left-aligned, neon accent side border, subtle glow, typewriter reveal.
    - Input area:
      - Fixed at the bottom of the container.
      - Command-line aesthetic:
        - Monospace.
        - A `$` or `foggybot>` prefix.
        - Thin border, `bg-black/40`, green caret via CSS.
      - “Send” button with neon hover using Framer Motion (`whileHover`, `whileTap`).

- **Animations**
  - Use `framer-motion` for:
    - Page/container entry (fade + slight upward motion).
    - Each message appearing with a short stagger and fade/slide.
  - Typewriter effect:
    - Implemented via a small custom React hook that:
      - Accepts the full AI reply string.
      - Reveals characters over time, using `setInterval` or `requestAnimationFrame`.
      - Pauses/finishes instantly when user sends another message (to avoid overlap).

### 8. Accessibility and UX Considerations

- No login or auth – instant anonymous access.
- Ensure sufficient contrast between text and obsidian background (especially with lime accents).
- Keyboard accessibility:
  - Input focused on page load.
  - Enter to send, Shift+Enter for newline (optional).
  - Button focus states clearly visible even in neon theme.
- Mobile:
  - The layout should adapt to small screens, with the chat container filling most of the viewport.
  - Ensure the input remains visible above the on-screen keyboard.

### 9. Dependencies

- Next.js (App Router, TypeScript).
- Tailwind CSS.
- Framer Motion.
- `rss-parser` for RSS integration.
- CSV parsing library (e.g. `csv-parse`).
- OpenAI Node SDK for `gpt-4o-mini`.

### 10. Testing and Validation

- **Utility-level tests** (where practical):
  - CSV parsing: verify that sample rows map to the expected `BaseReview` objects.
  - RSS parsing: test with a mocked RSS feed to ensure title, dates, and snippets are extracted.
  - Knowledge base merging: confirm that `byTitle` is populated correctly and case-insensitive lookups work.
  - Persona helpers: basic tests for intent detection (recommendation vs general chat).
- **Manual testing**:
  - Verify FoggyBot uses real review snippets and rating sentiment in its responses.
  - Confirm behavior when asking about unseen movies (dismissive + fallback suggestions).
  - Check mobile and desktop visual fidelity, animations, and performance.

