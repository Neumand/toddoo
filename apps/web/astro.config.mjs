import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";

const integrations = [tailwind()];

// PostHog web analytics — only enabled when the key is set
if (process.env.PUBLIC_POSTHOG_KEY) {
  const posthog = (await import("astro-posthog")).default;
  integrations.push(
    posthog({
      posthogKey: process.env.PUBLIC_POSTHOG_KEY,
      api_host: process.env.PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
    })
  );
}

export default defineConfig({
  integrations,
  output: "static",
  adapter: vercel(),
});
