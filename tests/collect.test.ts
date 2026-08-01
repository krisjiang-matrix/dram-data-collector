import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendSnapshot,
  loadSnapshots,
  parseUpdateDate,
  type Snapshot,
} from "../src/collect.js";

describe("parseUpdateDate", () => {
  it("parses date from TrendForce last-update string", () => {
    expect(parseUpdateDate("Last Update 2026-07-31 18:10 (GMT+8)")).toBe("2026-07-31");
  });

  it("falls back to current GMT+8 date when string is missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T20:00:00Z"));
    // 2026-08-01 20:00 UTC == 2026-08-02 04:00 GMT+8
    expect(parseUpdateDate(null)).toBe("2026-08-02");
    vi.useRealTimers();
  });

  it("falls back when string cannot be parsed", () => {
    expect(parseUpdateDate("garbage")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("jsonl store", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dram-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const snapshot = (date: string): Snapshot => ({
    date,
    publishedAt: `${date} 18:10 (GMT+8)`,
    prices: [
      {
        item: "DDR5 16Gb (2Gx8) 4800/5600",
        category: "DDR5",
        dailyHigh: 67,
        dailyLow: 32.85,
        sessionHigh: 67,
        sessionLow: 32.85,
        sessionAverage: 50.967,
        sessionChange: 0,
      },
    ],
  });

  it("appends and reloads snapshots", () => {
    const file = path.join(tmpDir, "prices.jsonl");
    appendSnapshot(snapshot("2026-07-31"), file);
    appendSnapshot(snapshot("2026-08-01"), file);

    const loaded = loadSnapshots(file);
    expect(loaded.map((s) => s.date)).toEqual(["2026-07-31", "2026-08-01"]);
    expect(loaded[0].prices[0].item).toBe("DDR5 16Gb (2Gx8) 4800/5600");
  });

  it("returns empty array for missing file", () => {
    const loaded = loadSnapshots(path.join(tmpDir, "nope.jsonl"));
    expect(loaded).toEqual([]);
  });

  it("creates the data directory when missing", () => {
    const nested = path.join(tmpDir, "a", "b", "prices.jsonl");
    appendSnapshot(snapshot("2026-07-31"), nested);
    expect(fs.existsSync(nested)).toBe(true);
  });
});
