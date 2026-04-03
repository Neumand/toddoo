import * as cheerio from "cheerio";
import type { Activity, Provider, ProviderResult } from "@toddoo/types";
import { detectBorough } from "../utils/borough.js";
import { generateId } from "../utils/hash.js";
import { slugify } from "../utils/slugify.js";

const BASE_URL = "https://westislandmommies.com";

export class WestIslandMommiesProvider implements Provider {
  name = "west-island-mommies";
  displayName = "West Island Mommies";
  regionId = "west-island";

  async scrape(): Promise<ProviderResult> {
    const errors: string[] = [];
    let activities: Activity[] = [];

    // Try WordPress REST API first
    try {
      activities = await this.scrapeViaApi();
      if (activities.length > 0) {
        return { activities, errors };
      }
    } catch (err) {
      errors.push(`WP API failed: ${err}`);
    }

    // Fallback to HTML scraping
    try {
      activities = await this.scrapeViaHtml();
    } catch (err) {
      errors.push(`HTML scrape failed: ${err}`);
    }

    return { activities, errors };
  }

  private async scrapeViaApi(): Promise<Activity[]> {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const url = new URL("/wp-json/wp/v2/posts", BASE_URL);
    url.searchParams.set("per_page", "20");
    url.searchParams.set("after", twoWeeksAgo.toISOString());
    url.searchParams.set("_embed", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Toddoo/1.0 (kids activity aggregator)" },
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const posts = (await res.json()) as WPPost[];
    return posts.flatMap((post) => this.parsePost(post));
  }

  private async scrapeViaHtml(): Promise<Activity[]> {
    const url = `${BASE_URL}/category/weekly-activities/`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Toddoo/1.0 (kids activity aggregator)" },
    });

    if (!res.ok) {
      throw new Error(`HTML fetch returned ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const activities: Activity[] = [];

    // Find article links on the category page
    const postLinks: string[] = [];
    $("article a, .entry-title a, h2 a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("activities-for")) {
        postLinks.push(href);
      }
    });

    // Deduplicate links
    const uniqueLinks = [...new Set(postLinks)].slice(0, 5);

    // Fetch and parse each post
    for (const link of uniqueLinks) {
      try {
        const postActivities = await this.scrapePostPage(link);
        activities.push(...postActivities);
      } catch (err) {
        // Skip individual post failures
      }
    }

    return activities;
  }

  private async scrapePostPage(url: string): Promise<Activity[]> {
    const res = await fetch(url, {
      headers: { "User-Agent": "Toddoo/1.0 (kids activity aggregator)" },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const content = $(".entry-content, .post-content, article").first();

    return this.extractActivitiesFromContent(content.html() || "", url);
  }

  private parsePost(post: WPPost): Activity[] {
    const content = post.content?.rendered || "";
    const postUrl = post.link || `${BASE_URL}/?p=${post.id}`;
    return this.extractActivitiesFromContent(content, postUrl);
  }

  private extractActivitiesFromContent(
    html: string,
    sourceUrl: string
  ): Activity[] {
    const $ = cheerio.load(html);
    const activities: Activity[] = [];
    const now = new Date().toISOString();

    // WIM posts typically list activities with bold headings or h3/h4 tags
    // Try to extract individual activities from the content
    const sections: { title: string; text: string }[] = [];

    $("h2, h3, h4, strong, b").each((_, el) => {
      const title = $(el).text().trim();
      if (title.length < 5 || title.length > 200) return;

      // Get text until next heading/bold
      let text = "";
      let node = $(el).parent().is("p") ? $(el).parent() : $(el);
      let sibling = node.next();
      while (sibling.length && !sibling.is("h2, h3, h4")) {
        text += " " + sibling.text();
        sibling = sibling.next();
      }

      sections.push({ title, text: text.trim() });
    });

    // If we found structured sections, create an activity per section
    if (sections.length > 0) {
      for (const section of sections) {
        const borough = detectBorough(section.title + " " + section.text);
        const activity: Activity = {
          id: generateId(this.name, `${sourceUrl}#${slugify(section.title)}`),
          title: section.title,
          description: section.text.slice(0, 500),
          sourceUrl,
          source: this.name,
          startDate: null,
          endDate: null,
          recurrence: null,
          borough,
          category: "community",
          ageGroup: null,
          location: null,
          address: null,
          cost: null,
          imageUrl: null,
          scrapedAt: now,
          slug: slugify(section.title),
        };
        activities.push(activity);
      }
    } else {
      // Fallback: treat the whole page as one activity
      const title = $("h1, h2").first().text().trim() || "Weekly Activities";
      const description = $.text().trim().slice(0, 500);
      const borough = detectBorough(description);

      activities.push({
        id: generateId(this.name, sourceUrl),
        title,
        description,
        sourceUrl,
        source: this.name,
        startDate: null,
        endDate: null,
        recurrence: null,
        borough,
        category: "community",
        ageGroup: null,
        location: null,
        address: null,
        cost: null,
        imageUrl: null,
        scrapedAt: now,
        slug: slugify(title),
      });
    }

    return activities;
  }
}

interface WPPost {
  id: number;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
}
