import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { scrapeDramPrices } from "./scraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, "../docs/data");
export const DATA_FILE = path.join(DATA_DIR, "dram_prices.jsonl");

/** The project TZ offset is GMT+8 (TrendForce publishes in Taiwan time). */
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Parse the publication date from TrendForce's "Last Update ..." string.
 * Example: "Last Update 2026-07-31 18:10 (GMT+8)"
 * Falls back to the current GMT+8 date if parsing fails.
 */
export function parseUpdateDate(lastUpdate: string | null): string {
  if (lastUpdate) {
    const match = lastUpdate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const now = new Date(Date.now() + TZ_OFFSET_MS);
  return now.toISOString().slice(0, 10);
}

export interface Snapshot {
  date: string;
  publishedAt: string;
  prices: Array<{
    item: string;
    category: string;
    dailyHigh: number;
    dailyLow: number;
    sessionHigh: number;
    sessionLow: number;
    sessionAverage: number;
    sessionChange: number;
  }>;
}

/** Load existing snapshots from the JSONL data file (or an empty array). */
export function loadSnapshots(file: string = DATA_FILE): Snapshot[] {
  if (!fs.existsSync(file)) return [];
  const lines = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as Snapshot);
}

/** Append a snapshot to the JSONL data file. */
export function appendSnapshot(snapshot: Snapshot, file: string = DATA_FILE): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(snapshot) + "\n", "utf8");
}

export async function main(): Promise<void> {
  const { prices, lastUpdate } = await scrapeDramPrices();

  const date = parseUpdateDate(lastUpdate);
  const publishedAt = lastUpdate
    ? lastUpdate.replace(/^Last Update\s*/, "").trim()
    : new Date().toISOString();

  const snapshots = loadSnapshots();
  const alreadyExists = snapshots.some((s) => s.date === date);

  console.log(`[Collect] Date:        ${date}`);
  console.log(`[Collect] Published:   ${publishedAt}`);
  console.log(`[Collect] Records:     ${prices.length}`);

  if (alreadyExists) {
    console.log(`[Collect] Snapshot for ${date} already exists — skipping.`);
    return;
  }

  const snapshot: Snapshot = { date, publishedAt, prices };
  appendSnapshot(snapshot);

  console.log(`[Collect] Appended snapshot for ${date} (${prices.length} items).`);
  console.log(`[Collect] File: ${DATA_FILE}`);
}

const isMain = (importMetaUrl: string): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  return importMetaUrl === pathToFileURL(path.resolve(entry)).href;
};

if (isMain(import.meta.url)) {
  main().catch((err) => {
    console.error("[Collect] Failed:", err);
    process.exit(1);
  });
}
