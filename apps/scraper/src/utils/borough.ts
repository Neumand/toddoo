import { WEST_ISLAND_BOROUGHS, type Borough } from "@toddoo/types";

const BOROUGH_ALIASES: Record<string, Borough> = {
  dorval: "Dorval",
  "pointe-claire": "Pointe-Claire",
  "pointe claire": "Pointe-Claire",
  "pte-claire": "Pointe-Claire",
  kirkland: "Kirkland",
  beaconsfield: "Beaconsfield",
  "baie-d'urfé": "Baie-D'Urfé",
  "baie d'urfe": "Baie-D'Urfé",
  "baie d'urfé": "Baie-D'Urfé",
  "sainte-anne-de-bellevue": "Sainte-Anne-de-Bellevue",
  "ste-anne-de-bellevue": "Sainte-Anne-de-Bellevue",
  senneville: "Senneville",
  "pierrefonds-roxboro": "Pierrefonds-Roxboro",
  pierrefonds: "Pierrefonds-Roxboro",
  roxboro: "Pierrefonds-Roxboro",
  "l'île-bizard–sainte-geneviève": "L'Île-Bizard–Sainte-Geneviève",
  "l'ile-bizard": "L'Île-Bizard–Sainte-Geneviève",
  "île-bizard": "L'Île-Bizard–Sainte-Geneviève",
  "ile bizard": "L'Île-Bizard–Sainte-Geneviève",
  "sainte-geneviève": "L'Île-Bizard–Sainte-Geneviève",
  "ste-genevieve": "L'Île-Bizard–Sainte-Geneviève",
  "dollard-des-ormeaux": "Dollard-des-Ormeaux",
  ddo: "Dollard-des-Ormeaux",
  dollard: "Dollard-des-Ormeaux",
};

export function detectBorough(text: string): Borough | null {
  const lower = text.toLowerCase();

  // Check exact borough names first
  for (const borough of WEST_ISLAND_BOROUGHS) {
    if (lower.includes(borough.toLowerCase())) {
      return borough;
    }
  }

  // Check aliases
  for (const [alias, borough] of Object.entries(BOROUGH_ALIASES)) {
    if (lower.includes(alias)) {
      return borough;
    }
  }

  return null;
}
