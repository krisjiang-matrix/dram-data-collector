import axios from "axios";
import * as cheerio from "cheerio";

export const TRENDFORCE_URL = "https://www.trendforce.com/price/dram/dram_spot";

export type DramCategory = "DDR5" | "DDR4" | "DDR3";

export interface DramPrice {
  item: string;
  category: DramCategory;
  dailyHigh: number;
  dailyLow: number;
  sessionHigh: number;
  sessionLow: number;
  sessionAverage: number;
  sessionChange: number;
}

export interface ScrapeResult {
  prices: DramPrice[];
  lastUpdate: string | null;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/**
 * Determine DRAM category from item name.
 */
export function categorizeItem(item: string): DramCategory {
  if (item.includes("DDR5")) return "DDR5";
  if (item.includes("DDR4")) return "DDR4";
  if (item.includes("DDR3")) return "DDR3";
  return "DDR4";
}

/**
 * Parse a percentage string like "▲ 0.07 %" / "▼ -0.65 %" / "— 0.00 %"
 * to a numeric percentage (e.g. 0.07% -> 0.07).
 */
export function parseSessionChange(changeStr: string): number {
  const match = changeStr.match(/[-+]?\d+\.?\d*/);
  if (!match) return 0;
  return parseFloat(match[0]);
}

/**
 * Parse a price string to a floating point value.
 */
export function parsePrice(priceStr: string): number {
  const value = parseFloat(priceStr.trim().replace(/,/g, ""));
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Scrape DRAM spot prices from the TrendForce page.
 * Only the "DRAM Spot Price" section (id="dram_spot") is collected,
 * which lists DDR5 / DDR4 / DDR3 spot prices.
 */
export async function scrapeDramPrices(): Promise<ScrapeResult> {
  const response = await axios.get(TRENDFORCE_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 20000,
  });

  return parseDramHtml(response.data);
}

/**
 * Parse DRAM spot prices from raw HTML. Exported separately for testing.
 */
export function parseDramHtml(html: string): ScrapeResult {
  const $ = cheerio.load(html);

  const lastUpdate = $(".price-last-update p").first().text().trim() || null;

  const prices: DramPrice[] = [];

  $("#dram_spot table.price-table tbody tr").each((_, element) => {
    const cells = $(element).find("td");
    if (cells.length < 7) return;

    const item = cells.eq(0).text().trim();
    if (!item) return;

    const dailyHigh = parsePrice(cells.eq(1).text());
    const dailyLow = parsePrice(cells.eq(2).text());
    const sessionHigh = parsePrice(cells.eq(3).text());
    const sessionLow = parsePrice(cells.eq(4).text());
    const sessionAverage = parsePrice(cells.eq(5).text());
    const sessionChange = parseSessionChange(cells.eq(6).text());

    if (
      ![dailyHigh, dailyLow, sessionHigh, sessionLow, sessionAverage].every(
        (v) => v > 0
      )
    ) {
      console.warn(`[Scraper] Skipping row with invalid prices for item "${item}"`);
      return;
    }

    prices.push({
      item,
      category: categorizeItem(item),
      dailyHigh,
      dailyLow,
      sessionHigh,
      sessionLow,
      sessionAverage,
      sessionChange,
    });
  });

  if (prices.length === 0) {
    throw new Error(
      "No DRAM price data found in the dram_spot section. The page structure may have changed."
    );
  }

  return { prices, lastUpdate };
}
