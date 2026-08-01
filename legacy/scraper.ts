import axios from "axios";
import * as cheerio from "cheerio";
import { InsertDramPrice } from "../drizzle/schema";

const TRENDFORCE_URL = "https://www.trendforce.com/price/dram/dram_spot";

interface RawPriceData {
  item: string;
  dailyHigh: number;
  dailyLow: number;
  sessionHigh: number;
  sessionLow: number;
  sessionAverage: number;
  sessionChange: number;
}

/**
 * Determine DRAM category from item name
 */
function categorizeItem(item: string): "DDR5" | "DDR4" | "DDR3" {
  if (item.includes("DDR5")) return "DDR5";
  if (item.includes("DDR4")) return "DDR4";
  if (item.includes("DDR3")) return "DDR3";
  return "DDR4"; // default fallback
}

/**
 * Parse percentage string like "▲ 0.07 %" or "▼ -0.65 %" to integer
 * Returns value * 100 to preserve decimals as integers (e.g., 0.07% -> 7)
 */
function parseSessionChange(changeStr: string): number {
  // Remove arrows and whitespace, extract the number
  const match = changeStr.match(/[-+]?\d+\.?\d*/);
  if (!match) return 0;
  
  const value = parseFloat(match[0]);
  // Store as integer: multiply by 100 to preserve 2 decimal places
  return Math.round(value * 100);
}

/**
 * Parse price string to integer (handles both integer and decimal formats)
 */
function parsePrice(priceStr: string): number {
  const value = parseFloat(priceStr.trim());
  return Math.round(value * 100); // Store as cents to preserve decimals
}

/**
 * Scrape DRAM prices from TrendForce
 */
export async function scrapeDramPrices(): Promise<InsertDramPrice[]> {
  try {
    const response = await axios.get(TRENDFORCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Find the DRAM Spot Price table
    const rows: RawPriceData[] = [];

    // Select all table rows (skip header row)
    $("table tbody tr").each((_, element) => {
      const cells = $(element).find("td");
      if (cells.length < 7) return; // Skip incomplete rows

      const item = cells.eq(0).text().trim();
      if (!item) return;

      try {
        const dailyHigh = parsePrice(cells.eq(1).text());
        const dailyLow = parsePrice(cells.eq(2).text());
        const sessionHigh = parsePrice(cells.eq(3).text());
        const sessionLow = parsePrice(cells.eq(4).text());
        const sessionAverage = parsePrice(cells.eq(5).text());
        const sessionChange = parseSessionChange(cells.eq(6).text());

        // Validate that we have reasonable price data
        if (sessionAverage <= 0 || dailyHigh <= 0 || dailyLow <= 0) {
          console.warn(`[Scraper] Skipping row with invalid prices for item "${item}"`);
          return;
        }

        rows.push({
          item,
          dailyHigh,
          dailyLow,
          sessionHigh,
          sessionLow,
          sessionAverage,
          sessionChange,
        });
      } catch (error) {
        console.warn(`[Scraper] Failed to parse row for item "${item}":`, error);
      }
    });

    // Validate that we scraped data
    if (rows.length === 0) {
      throw new Error("No DRAM price data found. The page structure may have changed.");
    }

    // Convert to database format
    const prices: InsertDramPrice[] = rows.map((row) => ({
      item: row.item,
      dailyHigh: row.dailyHigh,
      dailyLow: row.dailyLow,
      sessionHigh: row.sessionHigh,
      sessionLow: row.sessionLow,
      sessionAverage: row.sessionAverage,
      sessionChange: row.sessionChange,
      category: categorizeItem(row.item),
      recordedAt: new Date(),
    }));

    console.log(`[Scraper] Successfully scraped ${prices.length} DRAM price records`);
    return prices;
  } catch (error) {
    console.error("[Scraper] Failed to scrape DRAM prices:", error);
    throw error;
  }
}
