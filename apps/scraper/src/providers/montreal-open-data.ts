import type { Activity, Provider, ProviderResult, Borough } from "@toddoo/types";
import { WEST_ISLAND_BOROUGHS } from "@toddoo/types";
import { detectBorough } from "../utils/borough.js";
import { generateId } from "../utils/hash.js";
import { slugify } from "../utils/slugify.js";

const CKAN_BASE = "https://donnees.montreal.ca/api/3/action";

// Known dataset identifiers for loisirs/activities
const DATASET_CANDIDATES = [
  "programmation-des-activites-sportives-et-de-loisir",
  "activites-sportives-et-de-loisir",
];

export class MontrealOpenDataProvider implements Provider {
  name = "montreal-open-data";
  displayName = "Ville de Montréal";
  regionId = "west-island";

  async scrape(): Promise<ProviderResult> {
    const errors: string[] = [];
    const activities: Activity[] = [];

    for (const datasetId of DATASET_CANDIDATES) {
      try {
        const result = await this.fetchDataset(datasetId);
        activities.push(...result);
        if (result.length > 0) break;
      } catch (err) {
        errors.push(`Dataset ${datasetId}: ${err}`);
      }
    }

    // Also try searching for datasets
    if (activities.length === 0) {
      try {
        const result = await this.searchAndFetch();
        activities.push(...result);
      } catch (err) {
        errors.push(`Dataset search: ${err}`);
      }
    }

    return { activities, errors };
  }

  private async fetchDataset(datasetId: string): Promise<Activity[]> {
    // Get dataset metadata to find the resource URL
    const metaRes = await fetch(
      `${CKAN_BASE}/package_show?id=${datasetId}`,
      { headers: { "User-Agent": "Toddoo/1.0" } }
    );

    if (!metaRes.ok) {
      throw new Error(`package_show returned ${metaRes.status}`);
    }

    const metaData = (await metaRes.json()) as CKANPackageResponse;
    if (!metaData.success) {
      throw new Error("CKAN package_show not successful");
    }

    // Find a CSV or JSON resource
    const resources = metaData.result.resources || [];
    const jsonResource = resources.find(
      (r) => r.format?.toLowerCase() === "json" || r.format?.toLowerCase() === "geojson"
    );
    const csvResource = resources.find(
      (r) => r.format?.toLowerCase() === "csv"
    );

    const resource = jsonResource || csvResource;
    if (!resource) {
      throw new Error("No JSON or CSV resource found");
    }

    // Try datastore_search for structured access
    try {
      return await this.fetchViaDatastore(resource.id);
    } catch {
      // Fallback: fetch the resource directly
      return await this.fetchResourceDirectly(resource.url, resource.format);
    }
  }

  private async fetchViaDatastore(resourceId: string): Promise<Activity[]> {
    const url = `${CKAN_BASE}/datastore_search?resource_id=${resourceId}&limit=200`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Toddoo/1.0" },
    });

    if (!res.ok) {
      throw new Error(`datastore_search returned ${res.status}`);
    }

    const data = (await res.json()) as CKANDatastoreResponse;
    if (!data.success) {
      throw new Error("datastore_search not successful");
    }

    return this.parseRecords(data.result.records);
  }

  private async fetchResourceDirectly(
    url: string,
    format: string
  ): Promise<Activity[]> {
    const res = await fetch(url, {
      headers: { "User-Agent": "Toddoo/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Resource fetch returned ${res.status}`);
    }

    if (format.toLowerCase() === "csv") {
      const text = await res.text();
      return this.parseCsv(text);
    }

    const json = await res.json();
    const records = Array.isArray(json) ? json : json.data || json.records || [];
    return this.parseRecords(records);
  }

  private async searchAndFetch(): Promise<Activity[]> {
    const res = await fetch(
      `${CKAN_BASE}/package_search?q=activites+loisirs&rows=5`,
      { headers: { "User-Agent": "Toddoo/1.0" } }
    );

    if (!res.ok) {
      throw new Error(`package_search returned ${res.status}`);
    }

    const data = (await res.json()) as CKANSearchResponse;
    if (!data.success || !data.result.results.length) {
      throw new Error("No datasets found");
    }

    const activities: Activity[] = [];
    for (const pkg of data.result.results.slice(0, 3)) {
      try {
        const result = await this.fetchDataset(pkg.name);
        activities.push(...result);
        if (activities.length > 0) break;
      } catch {
        // Try next
      }
    }

    return activities;
  }

  private parseRecords(records: Record<string, unknown>[]): Activity[] {
    const now = new Date().toISOString();
    const activities: Activity[] = [];
    const westIslandBoroughsLower = WEST_ISLAND_BOROUGHS.map((b) =>
      b.toLowerCase()
    );

    for (const record of records) {
      // Common field name patterns in Montreal open data
      const name =
        getString(record, "NOM_ACTIVITE") ||
        getString(record, "nom_activite") ||
        getString(record, "NOM") ||
        getString(record, "nom") ||
        getString(record, "title") ||
        getString(record, "TITRE");

      if (!name) continue;

      const arrondissement =
        getString(record, "ARRONDISSEMENT") ||
        getString(record, "arrondissement") ||
        getString(record, "BOROUGH") ||
        getString(record, "borough") ||
        "";

      // Filter to West Island boroughs only
      const borough = detectBorough(arrondissement);
      if (!borough) {
        const arrLower = arrondissement.toLowerCase();
        const isWestIsland = westIslandBoroughsLower.some((b) =>
          arrLower.includes(b)
        );
        if (!isWestIsland && arrondissement) continue;
      }

      const startDate =
        getString(record, "DATE_DEBUT") ||
        getString(record, "date_debut") ||
        getString(record, "DATE") ||
        null;

      const endDate =
        getString(record, "DATE_FIN") ||
        getString(record, "date_fin") ||
        null;

      const location =
        getString(record, "LIEU") ||
        getString(record, "lieu") ||
        getString(record, "INSTALLATION") ||
        null;

      const address =
        getString(record, "ADRESSE") ||
        getString(record, "adresse") ||
        null;

      const cost =
        getString(record, "COUT") ||
        getString(record, "cout") ||
        getString(record, "TARIF") ||
        null;

      const description =
        getString(record, "DESCRIPTION") ||
        getString(record, "description") ||
        "";

      const sourceUrl = `https://donnees.montreal.ca`;

      activities.push({
        id: generateId(this.name, `${name}-${startDate || "ongoing"}`),
        title: name,
        description: description.slice(0, 500),
        sourceUrl,
        source: this.name,
        startDate,
        endDate,
        recurrence: null,
        borough,
        category: guessCategory(name + " " + description),
        ageGroup: null,
        location,
        address,
        cost,
        imageUrl: null,
        scrapedAt: now,
        slug: slugify(name),
      });
    }

    return activities;
  }

  private parseCsv(text: string): Activity[] {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] || "";
      });
      records.push(record);
    }

    return this.parseRecords(records);
  }
}

function getString(record: Record<string, unknown>, key: string): string | null {
  const val = record[key];
  if (typeof val === "string" && val.trim()) return val.trim();
  if (typeof val === "number") return String(val);
  return null;
}

function guessCategory(text: string): Activity["category"] {
  const lower = text.toLowerCase();
  if (/hockey|soccer|swim|sport|gym|basketball|tennis|skating/.test(lower))
    return "sports";
  if (/art|paint|draw|craft|pottery/.test(lower)) return "arts";
  if (/music|band|choir|guitar|piano/.test(lower)) return "music";
  if (/hik|park|nature|outdoor|garden/.test(lower)) return "outdoors";
  if (/camp/.test(lower)) return "camps";
  if (/librar|book|reading|story/.test(lower)) return "library";
  return "community";
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// CKAN API types
interface CKANPackageResponse {
  success: boolean;
  result: {
    resources: Array<{
      id: string;
      url: string;
      format: string;
      name: string;
    }>;
  };
}

interface CKANDatastoreResponse {
  success: boolean;
  result: {
    records: Record<string, unknown>[];
    total: number;
  };
}

interface CKANSearchResponse {
  success: boolean;
  result: {
    results: Array<{ name: string; title: string }>;
  };
}
