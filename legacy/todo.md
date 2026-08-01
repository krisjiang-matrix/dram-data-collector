# DRAM Price Tracker - Project TODO

## Database & Backend
- [x] Create `dramPrices` table with fields: Item, Daily High, Daily Low, Session High, Session Low, Session Average, Session Change, timestamp
- [x] Create `dramCategories` table for DDR5/DDR4/DDR3 classification (integrated into item)
- [x] Implement data scraping function using Cheerio to parse TrendForce page
- [x] Create tRPC procedures for fetching historical data and latest prices
- [x] Implement manual refresh endpoint
- [x] Add `/api/scheduled/scrape-dram-prices` handler for Heartbeat cron

## Frontend UI & Pages
- [x] Design elegant landing/dashboard page layout
- [x] Create price data table component showing latest prices
- [x] Implement category filter (DDR5/DDR4/DDR3)
- [x] Add manual refresh button with last update timestamp display
- [x] Create responsive design for mobile/tablet

## Charts & Visualization
- [x] Implement inflection point detection algorithm (local extrema)
- [x] Create interactive line chart with Recharts
- [x] Add chart markers for inflection points
- [x] Implement chart legend and tooltips
- [ ] Add date range selector for chart filtering (optional enhancement)

## Automation & Scheduling
- [ ] Set up Heartbeat cron job for daily data scraping (requires deployment)
- [ ] Configure cron schedule (daily at specific time)
- [ ] Test cron execution and error handling

## Testing & Deployment
- [ ] Write vitest unit tests for data scraping logic (manual testing done)
- [x] Write vitest tests for inflection point detection
- [ ] Test UI components and interactions
- [ ] Create checkpoint and deploy to production
