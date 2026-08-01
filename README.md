# DRAM Spot Price Collector

Daily DRAM spot price collector for [TrendForce](https://www.trendforce.com/price/dram/dram_spot), deployed as a GitHub Actions cron job with a GitHub Pages dashboard.

## How it works

- A GitHub Actions workflow runs **daily at 01:17 UTC (09:17 GMT+8)** — after TrendForce publishes its spot price at 17:50 GMT+8 — scraping the DRAM Spot Price table.
- Each day's snapshot is appended to [`docs/data/dram_prices.jsonl`](docs/data/dram_prices.jsonl) and committed back to the repo.
- A static dashboard at `docs/` renders the latest prices and a trend chart with inflection points. It is served by GitHub Pages and reads the JSONL directly (no build step).

## Quick start

```bash
npm install
npm run collect   # scrape today's prices and append to docs/data/dram_prices.jsonl
npm test          # run vitest unit tests
npm run typecheck
```

## Data format

Each line in `docs/data/dram_prices.jsonl` is one daily snapshot:

```json
{"date":"2026-07-31","publishedAt":"2026-07-31 18:10 (GMT+8)","prices":[{"item":"DDR5 16Gb (2Gx8) 4800/5600","category":"DDR5","dailyHigh":67.0,"dailyLow":32.85,"sessionHigh":67.0,"sessionLow":32.85,"sessionAverage":50.967,"sessionChange":0.0}, ...]}
```

Prices are in USD. `sessionChange` is a percentage (e.g. `0.29` means +0.29%).

## Repo layout

```
src/collect.ts            # entry point: scrape -> append snapshot (dedup by date)
src/scraper.ts            # TrendForce HTML parsing (axios + cheerio)
src/inflectionPoints.ts   # inflection point detection algorithm
tests/                    # vitest unit tests + HTML fixture
docs/                     # GitHub Pages dashboard + data/
.github/workflows/        # collect.yml daily cron
legacy/                   # original Manus/WebDev scaffold (reference only)
```

## Deployment notes

- Scheduling uses the built-in `GITHUB_TOKEN` (`permissions: contents: write`); no secrets required.
- If TrendForce changes its page structure, the scraper throws and the workflow fails visibly — update `src/scraper.ts` accordingly.
- GitHub Actions cron uses UTC; the workflow deliberately runs after TrendForce's daily publish window.
