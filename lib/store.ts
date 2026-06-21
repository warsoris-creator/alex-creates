import { promises as fs } from "fs";
import path from "path";
import { defaultContent, SiteContent } from "./content";

// Canonical content lives in data/content.json on the server's disk. Seeded from
// defaultContent on first run. This is the source of truth for every visitor and
// moves with the app to the future Linux server.
const dataDir = path.join(process.cwd(), "data");
const contentFile = path.join(dataDir, "content.json");

export async function readContent(): Promise<SiteContent> {
  try {
    const raw = await fs.readFile(contentFile, "utf8");
    return JSON.parse(raw) as SiteContent;
  } catch {
    // Not created yet — seed it and return the default.
    await writeContent(defaultContent);
    return defaultContent;
  }
}

export async function writeContent(content: SiteContent): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(contentFile, JSON.stringify(content, null, 2), "utf8");
}
