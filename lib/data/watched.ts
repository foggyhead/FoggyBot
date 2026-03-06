import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { BaseReview } from "./reviews";

function getWatchedPath() {
  return path.join(process.cwd(), "data", "watched.csv");
}

export async function loadWatched(): Promise<BaseReview[]> {
  try {
    const csvPath = getWatchedPath();
    const file = await fs.readFile(csvPath, "utf8");
    const records = parse(file, {
      columns: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];

    return records
      .map((row) => {
        const title = row["Name"]?.trim() ?? "";
        const date = row["Date"]?.trim() || undefined;
        const yearRaw = row["Year"]?.trim();

        let year: number | undefined;
        if (yearRaw) {
          const y = Number(yearRaw);
          year = Number.isFinite(y) ? y : undefined;
        }

        return {
          title,
          loggedAt: date,
          year,
          source: "watched" as const,
        };
      })
      .filter((r) => r.title.length > 0);
  } catch (err) {
    console.warn("Could not load watched.csv:", err);
    return [];
  }
}
