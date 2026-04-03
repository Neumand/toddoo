// --- Regions & Boroughs ---

export const WEST_ISLAND_BOROUGHS = [
  "Dorval",
  "Pointe-Claire",
  "Kirkland",
  "Beaconsfield",
  "Baie-D'Urfé",
  "Sainte-Anne-de-Bellevue",
  "Senneville",
  "Pierrefonds-Roxboro",
  "L'Île-Bizard–Sainte-Geneviève",
  "Dollard-des-Ormeaux",
] as const;

export type Borough = (typeof WEST_ISLAND_BOROUGHS)[number];

export interface Region {
  id: string;
  name: string;
  city: string;
  boroughs: readonly string[];
}

export const WEST_ISLAND: Region = {
  id: "west-island",
  name: "West Island",
  city: "Montreal",
  boroughs: WEST_ISLAND_BOROUGHS,
};

// --- Activity ---

export type ActivityCategory =
  | "sports"
  | "arts"
  | "music"
  | "outdoors"
  | "camps"
  | "library"
  | "community"
  | "other";

export type AgeGroup = "0-2" | "3-5" | "6-8" | "9-12" | "all-ages";

export interface Activity {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  source: string;
  startDate: string | null;
  endDate: string | null;
  recurrence: string | null;
  borough: Borough | null;
  category: ActivityCategory;
  ageGroup: AgeGroup | null;
  location: string | null;
  address: string | null;
  cost: string | null;
  imageUrl: string | null;
  scrapedAt: string;
  slug: string;
}

export interface ActivityData {
  lastUpdated: string;
  region: Region;
  activities: Activity[];
}

// --- Provider ---

export interface ProviderResult {
  activities: Activity[];
  errors: string[];
}

export interface Provider {
  name: string;
  displayName: string;
  regionId: string;
  scrape(): Promise<ProviderResult>;
}
