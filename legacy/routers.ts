import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getLatestDramPrices, getDramPriceHistory, getAllDramItems, insertDramPrices } from "./db";
import { scrapeDramPrices } from "./scraper";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dram: router({
    getLatestPrices: publicProcedure.query(async () => {
      return await getLatestDramPrices();
    }),

    getPriceHistory: publicProcedure
      .input(z.object({ item: z.string() }))
      .query(async ({ input }) => {
        return await getDramPriceHistory(input.item);
      }),

    getAllItems: publicProcedure.query(async () => {
      return await getAllDramItems();
    }),

    refreshData: publicProcedure.mutation(async () => {
      try {
        const prices = await scrapeDramPrices();
        await insertDramPrices(prices);
        return {
          success: true,
          recordsInserted: prices.length,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[tRPC] Failed to refresh DRAM data:", error);
        throw new Error("Failed to refresh DRAM data");
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
