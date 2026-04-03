import { createHash } from "node:crypto";

export function generateId(source: string, sourceUrl: string): string {
  return createHash("sha256")
    .update(`${source}:${sourceUrl}`)
    .digest("hex")
    .slice(0, 12);
}
