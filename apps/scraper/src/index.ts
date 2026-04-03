import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActivityData } from "@toddoo/types";
import { WEST_ISLAND } from "@toddoo/types";
import { providers } from "./providers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../../../data/activities.json");

async function main() {
  console.log(`🔍 Running ${providers.length} providers...`);

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      console.log(`  → ${provider.displayName}...`);
      const result = await provider.scrape();

      if (result.errors.length > 0) {
        console.warn(
          `  ⚠ ${provider.displayName} had errors:`,
          result.errors
        );
      }

      console.log(
        `  ✓ ${provider.displayName}: ${result.activities.length} activities`
      );
      return result;
    })
  );

  // Collect all activities
  const allActivities = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value.activities;
    }
    console.error(`  ✗ Provider failed:`, result.reason);
    return [];
  });

  // Deduplicate by id
  const seen = new Set<string>();
  const deduped = allActivities.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Prune past activities (endDate < today)
  const today = new Date().toISOString().split("T")[0];
  const current = deduped.filter((a) => {
    if (a.endDate && a.endDate < today) return false;
    return true;
  });

  // Sort by startDate ascending, nulls last
  current.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  const data: ActivityData = {
    lastUpdated: new Date().toISOString(),
    region: WEST_ISLAND,
    activities: current,
  };

  // Write to data file
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  console.log(
    `\n✅ Done! ${current.length} activities written to data/activities.json`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
