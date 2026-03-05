## FoggyBot – Letterboxd‑Powered Taste Engine

FoggyBot is an anonymous, neo‑cyberpunk chat interface where people talk to my digital twin, **foggybot**, powered by my full Letterboxd review history. It’s not just a chatbot – it’s a *taste engine* that lets people explore my cinema brain.

---

## Concept

- **Persona**: foggybot, the lowercase, clinically ironic, gen‑z film snob version of foggyhead.
- **Brain**:
  - `reviews.csv` (Letterboxd export: title, rating, review, year, directors).
  - Live Letterboxd RSS feed for fresh activity.
- **Behavior**:
  - Uses my real ratings + review snippets when movies are logged.
  - For unlogged movies, generates “off‑the‑record” takes in my voice instead of “i haven’t seen this”.
  - Understands **English, Hindi, and Hinglish**, matching the user’s language but keeping my signature tone.

---

## Key Features

- **Anonymous chat** – no auth, no accounts, just vibes.

- **Mood‑based taste engine**
  - Mood chips:
    - `existential spiral`, `quiet loneliness`, `cinematic beauty`, `chaos energy`, `soft heartbreak`
    - `brain rot cinema`, `body horror`, `emotional terrorism`, `psychological damage`
    - `main character syndrome`, `girly cinema`
  - For mood requests, foggybot replies in this structure:

    ```text
    mood detected: [mood name]
    translation: [short translation line]
    try:
    • [movie 1]
    • [movie 2]
    • [movie 3]
    ```

  - Always recommends 3 films, using real Letterboxd quotes when available, and simulated “essential damage” takes for unlogged films.

- **Shortcuts / commands**
  - `surprise me` – random foggyhead pick.
  - `taste stats` – average rating, favorite decade, top director, films logged.
  - `do not watch` – overrated / low‑rated “avoid” list with my notes.
  - `roast my taste` – playful diagnosis of the user’s vibe.
  - `foggyhead watched this` – single‑film log:

    ```text
    foggyhead log:

    film: [title]
    rating: [stars]
    mood: [tag]
    note: [one-line opinion]
    ```

- **No‑log opinion engine**
  - If a movie isn’t in `reviews.csv`, foggybot never says “i haven’t seen this”.
  - Instead: off‑record take like `i haven't officially logged this, but let's be real...`, using director / genre / reputation to simulate what I’d say.

- **Language‑aware responses**
  - English question → English answer in my Letterboxd tone.
  - Hindi question → Hindi / Hinglish answer, still sharp and lowercase.
  - Hinglish question → Hinglish answer, matching casualness.

- **UI / UX**
  - Neo‑cyberpunk, glassmorphism chat card with Electric Lime accents on deep obsidian.
  - Mood chips and shortcuts with Framer Motion hover animations.
  - Typewriter effect for foggybot’s replies + “foggybot is typing…” indicator.
  - Command‑line style input with rotating placeholder prompts.
  - Header with session id (`FOG‑1234 • anonymous session • cinema archive synced...`).
  - Handwritten signature footer: “built with clinical irony by harsha.” (Caveat font) + GitHub + Portfolio buttons.

---

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS, custom CSS for scrollbars & glassmorphism
- **Animations**: Framer Motion
- **AI**: OpenRouter (`openai/gpt‑4o‑mini`), persona + prompt‑engineering
- **Data**:
  - Local `data/reviews.csv` (Letterboxd export)
  - Live RSS via `rss-parser`
  - CSV parsing via `csv-parse`
- **Icons / Fonts**: `lucide-react`, Google Fonts (Geist, Geist Mono, Caveat)

---

## Project Structure

- `app/`
  - `page.tsx` – main page (chat + footer).
  - `api/foggybot/route.ts` – chat API endpoint (persona, mood/taste logic, OpenRouter call).
- `components/`
  - `ChatShell.tsx` – chat UI, mood chips, shortcuts, typewriter, typing indicator.
  - `FooterSignature.tsx` – handwritten signature + GitHub + portfolio cluster.
- `lib/data/`
  - `reviews.ts` – parses `data/reviews.csv` into normalized objects.
  - `rss.ts` – fetches and normalizes Letterboxd RSS.
  - `knowledge-base.ts` – merges CSV + RSS, caches, exposes helpers:
    - `getKnowledgeBase()`, `getLikedMovies()`, `getAvoidList()`, `getTasteStats()`.
- `lib/ai/`
  - `persona.ts` – system prompt + helper functions for snippets and matching titles.
  - `openrouter.ts` – thin OpenRouter client wrapper.

---

## Setup & Running Locally

1. **Clone**

```bash
git clone https://github.com/foggyhead/FoggyBot.git
cd FoggyBot
npm install
```

2. **Add `reviews.csv`**

Place your Letterboxd export at:

```bash
data/reviews.csv
```

Expected columns (at minimum): `Name`, `Rating`, `Review`, `Year`, `Directors`.

3. **Environment variables**

Create `.env.local`:

```env
OPENAI_API_KEY=
OPENROUTER_API_KEY=sk-or-...
LLM_MODEL=openai/gpt-4o-mini
LLM_BASE_URL=https://openrouter.ai/api/v1/chat/completions
```

4. **Run dev server**

```bash
npm run dev
```

Then open `http://localhost:3000`.

---

## How It Works

1. User message (chat, mood chip, or shortcut) hits `/api/foggybot`.
2. API loads/merges `reviews.csv` + RSS into a knowledge base.
3. Detects moods, special commands, and mentioned titles.
4. Builds a system prompt with:
   - foggyhead persona,
   - language rules (English / Hindi / Hinglish),
   - mood/translation behavior,
   - off‑record opinion logic for unlogged films.
5. Calls OpenRouter with `LLM_MODEL` and returns the answer.
6. `ChatShell` renders the response with typewriter + typing indicator.

---

## Nice Demo Prompts

- `what did you think of perfect blue?`
- `mood: brain rot cinema. what should i watch tonight?`
- `aaj raat kya dekhun, thoda sad but pretty?`
- `foggyhead watched this` (after typing a film name)
- `roast my taste`
- `taste stats`
- `what does harsha think about love?`

FoggyBot is meant to feel like talking to my own annoyed, cinema‑obsessed brain — not a generic assistant.
