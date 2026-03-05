import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

export type ReviewSource = "csv" | "rss";

export interface BaseReview {
  title: string;
  rating?: number;
  reviewText?: string;
  loggedAt?: string;
  year?: number;
  directors?: string[];
  source: ReviewSource;
}

function getCsvPath() {
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

  const reviews: BaseReview[] = records
    .map((row) => {
      const title = row["Name"]?.trim() ?? "";
      const ratingRaw = row["Rating"]?.trim();
      const reviewText = row["Review"]?.trim() || undefined;
       const yearRaw = row["Year"]?.trim();
       const directorsRaw = row["Directors"]?.trim();

      let rating: number | undefined;
      if (ratingRaw) {
        const parsed = Number(ratingRaw);
        rating = Number.isFinite(parsed) ? parsed : undefined;
      }

      let year: number | undefined;
      if (yearRaw) {
        const parsedYear = Number(yearRaw);
        year = Number.isFinite(parsedYear) ? parsedYear : undefined;
      }

      const directors =
        directorsRaw && directorsRaw.length > 0
          ? directorsRaw.split(",").map((d) => d.trim()).filter(Boolean)
          : undefined;

      return {
        title,
        rating,
        reviewText,
        year,
        directors,
        source: "csv" as const,
      };
    })
    .filter((r) => r.title.length > 0);

  return reviews;
}

