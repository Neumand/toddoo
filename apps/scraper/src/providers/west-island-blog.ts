import * as cheerio from "cheerio";
import type { Activity, Provider, ProviderResult } from "@toddoo/types";
import { detectBorough } from "../utils/borough.js";
import { generateId } from "../utils/hash.js";
import { slugify } from "../utils/slugify.js";

const BASE_URL = "https://westislandblog.com";

export class WestIslandBlogProvider implements Provider {
  name = "west-island-blog";
  displayName = "West Island Blog";
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
    url.searchParams.set("per_page", "15");
    url.searchParams.set("after", twoWeeksAgo.toISOString());
    url.searchParams.set("search", "event");
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
    const res = await fetch(BASE_URL, {
      headers: { "User-Agent": "Toddoo/1.0 (kids activity aggregator)" },
    });

    if (!res.ok) {
      throw new Error(`HTML fetch returned ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const activities: Activity[] = [];
    const now = new Date().toISOString();

    // Find article/event links on the homepage
    $("article, .post, .entry").each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find("h2 a, h3 a, .entry-title a").first();
      const title = titleEl.text().trim();
      const href = titleEl.attr("href");

      if (!title || !href) return;

      // Only include posts that seem event-related
      const text = $el.text().toLowerCase();
      const isEventRelated =
        /event|activit|festival|fair|show|concert|workshop|camp|family|kids|children/.test(
          text
        );
      if (!isEventRelated) return;

      const description = $el
        .find(".entry-excerpt, .entry-summary, .excerpt, p")
        .first()
        .text()
        .trim()
        .slice(0, 500);

      const imageUrl =
        $el.find("img").first().attr("src") || null;

      const borough = detectBorough(title + " " + description);

      activities.push({
        id: generateId(this.name, href),
        title,
        description,
        sourceUrl: href.startsWith("http") ? href : `${BASE_URL}${href}`,
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
        imageUrl,
        scrapedAt: now,
        slug: slugify(title),
      });
    });

    return activities;
  }

  private parsePost(post: WPPost): Activity[] {
    const now = new Date().toISOString();
    const title = decodeHtmlEntities(post.title?.rendered || "");
    const link = post.link || `${BASE_URL}/?p=${post.id}`;

    // Extract description from excerpt or content
    const $ = cheerio.load(post.excerpt?.rendered || post.content?.rendered || "");
    const description = $.text().trim().slice(0, 500);

    const borough = detectBorough(title + " " + description);

    const imageUrl =
      post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

    return [
      {
        id: generateId(this.name, link),
        title,
        description,
        sourceUrl: link,
        source: this.name,
        startDate: post.date || null,
        endDate: null,
        recurrence: null,
        borough,
        category: "community",
        ageGroup: null,
        location: null,
        address: null,
        cost: null,
        imageUrl,
        scrapedAt: now,
        slug: slugify(title),
      },
    ];
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

interface WPPost {
  id: number;
  link: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
}
