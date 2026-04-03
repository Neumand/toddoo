import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";
import { WeeklyDigest } from "./template.js";
import type { ActivityData } from "@toddoo/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../../../data/activities.json");

const SITE_URL = process.env.SITE_URL || "https://toddoo.vercel.app";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.error("RESEND_AUDIENCE_ID environment variable is required");
    process.exit(1);
  }

  // Read activity data
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data: ActivityData = JSON.parse(raw);

  if (data.activities.length === 0) {
    console.log("No activities to send. Skipping newsletter.");
    return;
  }

  // Get the upcoming week's activities (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const todayStr = today.toISOString().split("T")[0];
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const upcomingActivities = data.activities.filter((a) => {
    if (!a.startDate) return true; // Include ongoing activities
    return a.startDate >= todayStr && a.startDate <= nextWeekStr;
  });

  // Fall back to all activities if nothing is specifically this week
  const activitiesToSend =
    upcomingActivities.length > 0 ? upcomingActivities : data.activities.slice(0, 10);

  const weekOf = today.toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const resend = new Resend(apiKey);

  console.log(`Sending newsletter with ${activitiesToSend.length} activities...`);

  // Fetch subscribers from the Resend audience
  const { data: contacts } = await resend.contacts.list({ audienceId });

  if (!contacts?.data?.length) {
    console.log("No subscribers found. Skipping send.");
    return;
  }

  const subscriberEmails = contacts.data
    .filter((c) => !c.unsubscribed)
    .map((c) => c.email);

  console.log(`Sending to ${subscriberEmails.length} subscribers...`);

  // Send to each subscriber
  const fromEmail = process.env.FROM_EMAIL || "Toddoo <newsletter@toddoo.app>";

  const { error } = await resend.batch.send(
    subscriberEmails.map((email) => ({
      from: fromEmail,
      to: email,
      subject: `Toddoo: ${activitiesToSend.length} Kids Activities This Week - ${weekOf}`,
      react: WeeklyDigest({
        activities: activitiesToSend,
        weekOf,
        siteUrl: SITE_URL,
      }),
    }))
  );

  if (error) {
    console.error("Failed to send newsletter:", error);
    process.exit(1);
  }

  console.log(`Newsletter sent to ${subscriberEmails.length} subscribers!`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
