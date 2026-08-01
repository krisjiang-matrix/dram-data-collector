import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { scrapeDramPrices } from "./scraper";
import { insertDramPrices } from "./db";

/**
 * Handler for scheduled DRAM price scraping
 * Called by Heartbeat cron job
 */
export async function handleScrapeDramPrices(req: Request, res: Response) {
  try {
    // Authenticate as cron
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log(`[Scheduled] Starting DRAM price scrape at ${new Date().toISOString()}`);

    // Scrape prices from TrendForce
    const prices = await scrapeDramPrices();
    console.log(`[Scheduled] Scraped ${prices.length} price records`);

    // Insert into database
    await insertDramPrices(prices);
    console.log(`[Scheduled] Inserted ${prices.length} records into database`);

    return res.json({
      ok: true,
      recordsScraped: prices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Scheduled] Error during DRAM price scrape:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    return res.status(500).json({
      error: errorMessage,
      stack,
      context: {
        url: req.url,
        taskUid: (await sdk.authenticateRequest(req).catch(() => ({ taskUid: null }))).taskUid,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
