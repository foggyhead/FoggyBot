import { NextResponse } from "next/server";
import {
  getAvoidList,
  getKnowledgeBase,
  getLikedMovies,
  getReviewStyleSamples,
  getTasteStats,
} from "@/lib/data/knowledge-base";
import {
  buildSystemPrompt,
  extractMentionedTitles,
  selectReviewSnippet,
} from "@/lib/ai/persona";
import { createChatCompletion } from "@/lib/ai/openrouter";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages = body.messages ?? [];
    const userMessage = messages[messages.length - 1]?.content ?? "";

    const kb = await getKnowledgeBase();
    const mentioned = extractMentionedTitles(userMessage, kb);
    const lowerUser = userMessage.toLowerCase();

    const contextParts: string[] = [];

    // Style anchor: foggyhead's actual review writing so the model mirrors her voice
    const styleSamples = getReviewStyleSamples(kb, 4);
    if (styleSamples.length > 0) {
      contextParts.push(
        "foggyhead's review style (write in a similar tone and level of detail):",
      );
      for (const r of styleSamples) {
        const snippet =
          r.reviewText && r.reviewText.length > 200
            ? r.reviewText.slice(0, 200) + "..."
            : r.reviewText || "";
        if (snippet) {
          contextParts.push(
            `"${r.title}"${typeof r.rating === "number" ? ` (${r.rating}/5)` : ""}: ${snippet}`,
          );
        }
      }
    }
    for (const titleKey of mentioned) {
      const reviews = kb.byTitle[titleKey];
      if (!reviews?.length) continue;
      const snippet = selectReviewSnippet(reviews);
      const title = reviews[0].title;
      const ratings = reviews
        .map((r) => (typeof r.rating === "number" ? r.rating : "n/a"))
        .join(", ");
      contextParts.push(
        `movie: "${title}" | ratings: ${ratings} | snippet: ${
          snippet || "no review text"
        }`,
      );
    }

    const isRecommendationRequest =
      /recommend|rec me|what should i watch|suggest|watch next|give me.*movie/i.test(
        lowerUser,
      ) || lowerUser.startsWith("mood:");

    const wantsStats = /taste stats|stats|foggyhead's taste stats/i.test(
      lowerUser,
    );

    const wantsAvoid =
      /do not watch|don't watch|avoid something|overrated|worst films|worst movies/i.test(
        lowerUser,
      );

    const wantsRandom =
      /surprise me|random pick|random foggyhead pick/i.test(lowerUser);

    const wantsPersonalizedRec =
      /suggest for me|pick for me|what's for me|based on what i've asked|recommend something for me/i.test(
        lowerUser,
      );

    const wantsWatchedSummary = lowerUser.includes("foggyhead watched this");

    if (isRecommendationRequest) {
      const liked = getLikedMovies(kb, 4)
        .slice(0, 8)
        .map((r) => ({
          title: r.title,
          rating: r.rating,
          snippet: r.reviewText
            ? selectReviewSnippet([r])
            : undefined,
        }));

      if (liked.length > 0) {
        contextParts.push(
          "some movies foggyhead actually liked (use these for recs, quote them directly):",
        );
        for (const item of liked) {
          contextParts.push(
            `movie: "${item.title}" | rating: ${
              typeof item.rating === "number" ? item.rating : "n/a"
            } | snippet: ${item.snippet || "no review text"}`,
          );
        }
      }
    }

    if (wantsStats) {
      const stats = getTasteStats(kb);
      contextParts.push(
        `foggyhead taste stats -> average rating: ${stats.averageRating}, favorite decade: ${stats.favoriteDecade}, top director: ${stats.topDirector}, films logged: ${stats.filmsLogged}`,
      );
    }

    if (wantsAvoid) {
      const avoid = getAvoidList(kb, 2.5, 10);
      if (avoid.length > 0) {
        contextParts.push(
          "movies foggyhead thinks are overrated / do not watch unless you like suffering:",
        );
        for (const r of avoid) {
          const snippet = r.reviewText
            ? selectReviewSnippet([r])
            : undefined;
          contextParts.push(
            `movie: "${r.title}" | rating: ${
              typeof r.rating === "number" ? r.rating : "n/a"
            } | snippet: ${snippet || "no review text"}`,
          );
        }
      }
    }

    if (wantsRandom) {
      const liked = getLikedMovies(kb, 3.5);
      if (liked.length > 0) {
        const random =
          liked[Math.floor(Math.random() * liked.length)];
        const snippet = random.reviewText
          ? selectReviewSnippet([random])
          : undefined;
        contextParts.push(
          `random foggyhead pick -> "${random.title}" | rating: ${
            typeof random.rating === "number" ? random.rating : "n/a"
          } | snippet: ${snippet || "no review text"}`,
        );
      }
    }

    if (wantsPersonalizedRec) {
      const liked = getLikedMovies(kb, 3.5)
        .slice(0, 10)
        .map((r) => ({
          title: r.title,
          rating: r.rating,
          snippet: r.reviewText ? selectReviewSnippet([r]) : undefined,
        }));
      if (liked.length > 0) {
        contextParts.push(
          "user wants a personalized rec (based on what they've asked or in general). use foggyhead's taste — here are films she liked:",
        );
        for (const item of liked) {
          contextParts.push(
            `movie: "${item.title}" | rating: ${typeof item.rating === "number" ? item.rating : "n/a"} | snippet: ${item.snippet || "no review text"}`,
          );
        }
      }
    }

    if (wantsWatchedSummary) {
      contextParts.push(
        "for a 'foggyhead watched this' request, respond strictly in this structure, all lowercase:",
      );
      contextParts.push(
        "foggyhead log:\n\nfilm: [exact title]\nrating: [star rating like ★★★★☆ or ★★★★½]\nmood: [short tag like 'existential spiral' or 'soft heartbreak']\nnote: [one-line opinion pulled from or inspired by the review]",
      );
    }

    const systemPrompt = buildSystemPrompt(kb);

    const allMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      contextParts.length
        ? {
            role: "system",
            content:
              "here are some of foggyhead's logs that might be relevant:\n" +
              contextParts.join("\n"),
          }
        : null,
      ...messages,
    ].filter(Boolean) as ChatMessage[];

    const completion = await createChatCompletion({
      messages: allMessages,
      temperature: 0.85,
      maxTokens: 560,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("FoggyBot API error:", error);
    // fallback: if the model call fails, still return something from foggyhead's logs
    try {
      const kb = await getKnowledgeBase();
      const liked = getLikedMovies(kb, 4).slice(0, 3);
      if (liked.length > 0) {
        const lines: string[] = [];
        lines.push("couldn't reach the model. here are a few she liked:");
        lines.push("");
        for (const r of liked) {
          const snippet = r.reviewText
            ? selectReviewSnippet([r])
            : undefined;
          lines.push(
            `• ${r.title}${
              typeof r.rating === "number" ? ` (${r.rating}/5)` : ""
            } — ${snippet || "she liked it."}`,
          );
        }
        return NextResponse.json({ reply: lines.join("\n") });
      }
    } catch (fallbackError) {
      console.error("FoggyBot fallback error:", fallbackError);
    }

    const devDetail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? ` (${error.message})`
        : "";
    return NextResponse.json(
      {
        reply:
          "something went wrong. try again in a bit." + devDetail,
      },
      { status: 500 },
    );
  }
}

