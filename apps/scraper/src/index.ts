import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActivityData } from "@toddoo/types";
import { WEST_ISLAND } from "@toddoo/types";
import { providers } from "./providers/index.js";
import { PostHog } from "posthog-node";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../../../data/activities.json");

function createPostHog(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;

  return new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}

async function main() {
  const posthog = createPostHog();
  const scrapeStart = Date.now();

  console.log(`🔍 Running ${providers.length} providers...`);

  const providerMetrics: Array<{
    name: string;
    activities: number;
    errors: string[];
    durationMs: number;
  }> = [];

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      console.log(`  → ${provider.displayName}...`);
      const start = Date.now();
      const result = await provider.scrape();
      const durationMs = Date.now() - start;

      if (result.errors.length > 0) {
        console.warn(
          `  ⚠ ${provider.displayName} had errors:`,
          result.errors
        );
      }

      console.log(
        `  ✓ ${provider.displayName}: ${result.activities.length} activities (${durationMs}ms)`
      );

      providerMetrics.push({
        name: provider.name,
        activities: result.activities.length,
        errors: result.errors,
        durationMs,
      });

      posthog?.capture({
        distinctId: "toddoo-scraper",
        event: "provider_completed",
        properties: {
          provider: provider.name,
          activities_found: result.activities.length,
          error_count: result.errors.length,
          errors: result.errors.slice(0, 5),
          duration_ms: durationMs,
        },
      });

      return result;
    })
  );

  // Track provider failures (Promise rejections)
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const provider = providers[i];
      console.error(`  ✗ ${provider.displayName} failed:`, result.reason);
      posthog?.capture({
        distinctId: "toddoo-scraper",
        event: "provider_failed",
        properties: {
          provider: provider.name,
          error: String(result.reason),
        },
      });
    }
  });

  // Collect all activities
  const allActivities = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value.activities;
    }
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

  const totalDurationMs = Date.now() - scrapeStart;

  console.log(
    `\n✅ Done! ${current.length} activities written to data/activities.json (${totalDurationMs}ms)`
  );

  // Summary event
  posthog?.capture({
    distinctId: "toddoo-scraper",
    event: "scrape_completed",
    properties: {
      total_activities: current.length,
      total_raw: allActivities.length,
      total_deduped: deduped.length,
      total_pruned: deduped.length - current.length,
      duration_ms: totalDurationMs,
      providers: providerMetrics.map((m) => ({
        name: m.name,
        activities: m.activities,
        errors: m.errors.length,
        duration_ms: m.durationMs,
      })),
    },
  });

  if (posthog) {
    await posthog.shutdown();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
