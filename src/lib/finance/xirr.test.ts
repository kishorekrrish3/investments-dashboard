import { describe, it, expect } from "vitest";
import { calculateXIRR } from "./xirr";

describe("calculateXIRR", () => {
  it("should calculate exact annual return for 1-year lump sum investment", () => {
    const cashFlows = [
      { date: "2025-01-01", amount: -100000 },
      { date: "2026-01-01", amount: 112000 }, // 12% annual gain
    ];

    const xirr = calculateXIRR(cashFlows);
    expect(xirr).toBeCloseTo(12.0, 0.5);
  });

  it("should accurately calculate XIRR for a monthly SIP", () => {
    // 6 monthly investments of ₹5,000 each (Total ₹30,000 invested)
    const cashFlows = [
      { date: "2026-01-05", amount: -5000 },
      { date: "2026-02-05", amount: -5000 },
      { date: "2026-03-05", amount: -5000 },
      { date: "2026-04-05", amount: -5000 },
      { date: "2026-05-05", amount: -5000 },
      { date: "2026-06-05", amount: -5000 },
      { date: "2026-07-05", amount: 32500 }, // Terminal value
    ];

    const xirr = calculateXIRR(cashFlows);
    expect(xirr).toBeGreaterThan(15);
    expect(xirr).toBeLessThan(35);
  });

  it("should handle transactions with dividends and partial redemptions", () => {
    const cashFlows = [
      { date: "2025-01-10", amount: -50000 }, // Initial buy
      { date: "2025-06-15", amount: 1200 },   // Dividend received
      { date: "2025-10-20", amount: 15000 },  // Partial sale
      { date: "2026-01-10", amount: 42000 },  // Current remaining value
    ];

    const xirr = calculateXIRR(cashFlows);
    expect(xirr).toBeGreaterThan(10);
  });

  it("should return 0 for degenerate or invalid cash flows", () => {
    expect(calculateXIRR([])).toBe(0);
    expect(calculateXIRR([{ date: "2026-01-01", amount: -5000 }])).toBe(0);
    expect(
      calculateXIRR([
        { date: "2026-01-01", amount: -5000 },
        { date: "2026-02-01", amount: -5000 },
      ])
    ).toBe(0);
  });
});
