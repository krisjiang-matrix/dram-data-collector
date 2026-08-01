import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  parseDramHtml,
  parsePrice,
  parseSessionChange,
  categorizeItem,
} from "../src/scraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "spot.html"), "utf8");

describe("scraper parsing", () => {
  it("should parse last update timestamp", () => {
    const result = parseDramHtml(fixture);
    expect(result.lastUpdate).toBe("Last Update 2026-07-31 18:10 (GMT+8)");
  });

  it("should extract all 7 DRAM spot items", () => {
    const result = parseDramHtml(fixture);
    expect(result.prices).toHaveLength(7);
  });

  it("should parse categories correctly", () => {
    const result = parseDramHtml(fixture);
    const byItem = Object.fromEntries(result.prices.map((p) => [p.item, p.category]));

    expect(byItem["DDR5 16Gb (2Gx8) 4800/5600"]).toBe("DDR5");
    expect(byItem["DDR5 16Gb (2Gx8) eTT"]).toBe("DDR5");
    expect(byItem["DDR4 16Gb (2Gx8) 3200"]).toBe("DDR4");
    expect(byItem["DDR3 4Gb 512Mx8 1600/1866"]).toBe("DDR3");
  });

  it("should parse prices and session change", () => {
    const result = parseDramHtml(fixture);
    const ddr5 = result.prices.find((p) => p.item === "DDR5 16Gb (2Gx8) 4800/5600")!;

    expect(ddr5.dailyHigh).toBeCloseTo(67.0, 2);
    expect(ddr5.dailyLow).toBeCloseTo(32.85, 2);
    expect(ddr5.sessionAverage).toBeCloseTo(50.967, 3);
    expect(ddr5.sessionChange).toBe(0);
  });

  it("should parse negative session change", () => {
    const result = parseDramHtml(fixture);
    const ddr4 = result.prices.find((p) => p.item === "DDR4 8Gb (1Gx8) 3200")!;

    expect(ddr4.sessionChange).toBeCloseTo(-0.04, 2);
  });

  it("should parse positive session change", () => {
    const result = parseDramHtml(fixture);
    const ddr4 = result.prices.find((p) => p.item === "DDR4 16Gb (2Gx8) 3200")!;

    expect(ddr4.sessionChange).toBeCloseTo(0.29, 2);
  });

  it("should throw when no price data is present", () => {
    expect(() => parseDramHtml("<html><body>no tables here</body></html>")).toThrow();
  });
});

describe("parsePrice", () => {
  it("parses plain decimals", () => {
    expect(parsePrice("50.967")).toBeCloseTo(50.967, 3);
  });

  it("parses strings with whitespace", () => {
    expect(parsePrice(" 67.00 ")).toBeCloseTo(67.0, 2);
  });

  it("returns NaN for invalid input", () => {
    expect(parsePrice("--")).toBeNaN();
  });
});

describe("parseSessionChange", () => {
  it("parses arrows and signs", () => {
    expect(parseSessionChange("▲ 0.07 %")).toBeCloseTo(0.07, 2);
    expect(parseSessionChange("▼ -0.65 %")).toBeCloseTo(-0.65, 2);
    expect(parseSessionChange("— 0.00 %")).toBe(0);
  });
});

describe("categorizeItem", () => {
  it("detects each category", () => {
    expect(categorizeItem("DDR5 16Gb (2Gx8) 4800/5600")).toBe("DDR5");
    expect(categorizeItem("DDR4 8Gb (1Gx8) 3200")).toBe("DDR4");
    expect(categorizeItem("DDR3 4Gb 512Mx8 1600/1866")).toBe("DDR3");
  });

  it("falls back to DDR4 for unknown items", () => {
    expect(categorizeItem("GDDR6 8Gb")).toBe("DDR4");
    expect(categorizeItem("LPDDR5X 16GB")).toBe("DDR5");
  });
});
