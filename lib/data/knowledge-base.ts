import { loadCsvReviews, type BaseReview } from "./reviews";
import { loadRssReviews } from "./rss";
import { loadRatings } from "./ratings";
import { loadWatched } from "./watched";

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

  const staticPromise = cachedKb
    ? Promise.resolve(
        cachedKb.reviews.filter(
          (r) => r.source !== "rss",
        ),
      )
    : Promise.all([
        loadCsvReviews(),
        loadRatings(),
        loadWatched(),
      ]).then(([reviews, ratings, watched]) => [
        ...reviews,
        ...ratings,
        ...watched,
      ]);

  const rssPromise = needFreshRss
    ? loadRssReviews()
    : Promise.resolve(
        cachedKb?.reviews.filter((r) => r.source === "rss") || [],
      );

  const [staticReviews, rssReviews] = await Promise.all([
    staticPromise,
    rssPromise,
  ]);

  if (needFreshRss) {
    lastRssFetch = now;
  }

  const all = [...staticReviews, ...rssReviews];
  const byTitle = buildByTitle(all);

  cachedKb = { reviews: all, byTitle };
  return cachedKb;
}

export function getLikedMovies(
  kb: KnowledgeBase,
  minRating = 3.5,
): BaseReview[] {
  return kb.reviews.filter(
    (r) => typeof r.rating === "number" && (r.rating as number) >= minRating,
  );
}

/** Picks reviews with substantial review text to use as style anchors (how foggyhead writes). */
export function getReviewStyleSamples(
  kb: KnowledgeBase,
  count = 4,
): BaseReview[] {
  const withText = kb.reviews.filter(
    (r) => r.source === "csv" && r.reviewText && r.reviewText.length >= 40,
  );
  if (withText.length <= count) return withText;
  const step = Math.max(1, Math.floor(withText.length / count));
  const out: BaseReview[] = [];
  for (let i = 0; i < count && i * step < withText.length; i++) {
    out.push(withText[i * step]);
  }
  return out;
}

export function getAvoidList(
  kb: KnowledgeBase,
  maxRating = 2.5,
  limit = 10,
): BaseReview[] {
  return kb.reviews
    .filter(
      (r) => typeof r.rating === "number" && (r.rating as number) <= maxRating,
    )
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
    .slice(0, limit);
}

export function getTasteStats(kb: KnowledgeBase) {
  const rated = kb.reviews.filter(
    (r) =>
      typeof r.rating === "number" &&
      (r.source === "csv" || r.source === "ratings"),
  );
  const avgRating =
    rated.reduce((sum, r) => sum + (r.rating as number), 0) /
      (rated.length || 1) || 0;

  const decadeCounts = new Map<string, number>();
  const directorCounts = new Map<string, number>();

  for (const r of kb.reviews) {
    if (
      (r.source === "csv" || r.source === "ratings" || r.source === "watched") &&
      typeof r.year === "number"
    ) {
      const decadeStart = Math.floor(r.year / 10) * 10;
      const label = `${decadeStart}s`;
      decadeCounts.set(label, (decadeCounts.get(label) ?? 0) + 1);
    }
    if (r.source === "csv" && r.directors) {
      for (const d of r.directors) {
        directorCounts.set(d, (directorCounts.get(d) ?? 0) + 1);
      }
    }
  }

  const favoriteDecade =
    [...decadeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "unknown";
  const topDirector =
    [...directorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "unknown";

  // Count unique films across all sources (reviews + ratings + watched + rss)
  const filmsLogged = new Set(
    kb.reviews.map((r) => normalizeTitle(r.title)),
  ).size;

  return {
    averageRating: Number(avgRating.toFixed(2)),
    favoriteDecade,
    topDirector,
    filmsLogged,
  };
}


