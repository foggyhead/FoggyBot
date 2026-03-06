import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { BaseReview } from "./reviews";

function getRatingsPath() {
  return path.join(process.cwd(), "data", "ratings.csv");
}

export async function loadRatings(): Promise<BaseReview[]> {
  try {
    const csvPath = getRatingsPath();
    const file = await fs.readFile(csvPath, "utf8");
    const records = parse(file, {
      columns: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];

    return records
      .map((row) => {
        const title = row["Name"]?.trim() ?? "";
        const date = row["Date"]?.trim() || undefined;
        const ratingRaw = row["Rating"]?.trim();
        const yearRaw = row["Year"]?.trim();

        let rating: number | undefined;
        if (ratingRaw) {
          const parsed = Number(ratingRaw);
          rating = Number.isFinite(parsed) ? parsed : undefined;
        }

        let year: number | undefined;
        if (yearRaw) {
          const y = Number(yearRaw);
          year = Number.isFinite(y) ? y : undefined;
        }

        return {
          title,
          rating,
          loggedAt: date,
          year,
          source: "ratings" as const,
        };
      })
      .filter((r) => r.title.length > 0);
  } catch (err) {
    console.warn("Could not load ratings.csv:", err);
    return [];
  }
}
