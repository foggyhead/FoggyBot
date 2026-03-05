import Parser from "rss-parser";
import type { BaseReview } from "./reviews";

const LETTERBOXD_RSS_URL = "https://letterboxd.com/foggyhead/rss/";

const parser = new Parser();

export async function loadRssReviews(): Promise<BaseReview[]> {
  try {
    const feed = await parser.parseURL(LETTERBOXD_RSS_URL);

    const reviews: BaseReview[] = (feed.items || [])
      .map((item) => {
        const title = (item.title || "").trim();
        const reviewText =
          (item.contentSnippet || item.content || "").trim() || undefined;
        const loggedAt = (item.isoDate || item.pubDate || undefined) as
          | string
          | undefined;

        const rating: number | undefined = undefined;

        return {
          title,
          reviewText,
          loggedAt,
          rating,
          source: "rss" as const,
        };
      })
      .filter((r) => r.title.length > 0);

    return reviews;
  } catch (error) {
    console.error("Failed to load Letterboxd RSS:", error);
    return [];
  }
}

