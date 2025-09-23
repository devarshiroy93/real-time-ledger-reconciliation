import { describe, it, expect } from "vitest";
import { decideOutcome } from "../lambdas/reconciliation-engine/index";

// Mock helpers
function customer(status: string, amount = 100) {
  return { txId: "tx1", status, amount };
}
function entry(amount: number) {
  return { txId: "tx1", amount };
}

describe("ReconciliationEngine decideOutcome", () => {
  it("returns PENDING if only customer entry exists with PENDING status", () => {
    const result = decideOutcome(customer("PENDING"), [], []);
    expect(result.category).toBe("PENDING ⏳");
    expect(result.details).toMatch(/PENDING/);
  });

  it("returns MISMATCH if processor entry is missing", () => {
    const result = decideOutcome(customer("SETTLED"), [], [entry(100)]);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Missing Processor/);
  });

  it("returns MISMATCH if core entry is missing", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100)], []);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Missing Core/);
  });

  it("returns MISMATCH if multiple processor entries (duplicate)", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100), entry(100)], []);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Duplicate settlement in Processor/);
  });

  it("returns MISMATCH if multiple core entries (duplicate)", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100)], [entry(100), entry(100)]);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Duplicate settlement in Core/);
  });

  it("returns MATCHED if amounts equal and customer is SETTLED", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100)], [entry(100)]);
    expect(result.category).toBe("MATCHED ✅");
    expect(result.details).toMatch(/All ledgers agree/);
  });

  it("returns MISMATCH FX Adjustment if amounts differ by 1 (positive)", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100)], [entry(101)]);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/FX Adjustment/);
  });

  it("returns MISMATCH FX Adjustment if amounts differ by 1 (negative)", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(101)], [entry(100)]);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/FX Adjustment/);
  });

  it("returns MISMATCH if amounts differ more than 1", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100)], [entry(105)]);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Amounts differ/);
  });

  it("still returns PENDING if customer is PENDING and no processor/core yet", () => {
    const result = decideOutcome(customer("PENDING"), [], []);
    expect(result.category).toBe("PENDING ⏳");
  });

  // --- Extra Edge Cases ---

  it("returns PENDING if processor+core exist but customer still PENDING", () => {
    const result = decideOutcome(customer("PENDING"), [entry(100)], [entry(100)]);
    expect(result.category).toBe("PENDING ⏳");
    expect(result.details).toMatch(/Customer shows PENDING/);
  });

  it("returns MISMATCH if customer is SETTLED but processor missing", () => {
    const result = decideOutcome(customer("SETTLED"), [], [entry(100)]);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Missing Processor/);
  });

  it("returns MISMATCH if customer is SETTLED but core missing", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100)], []);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Missing Core/);
  });

  it("handles extreme duplicate case (3 processor entries)", () => {
    const result = decideOutcome(customer("SETTLED"), [entry(100), entry(100), entry(100)], []);
    expect(result.category).toBe("MISMATCH ❌");
    expect(result.details).toMatch(/Duplicate settlement in Processor/);
  });

  it("returns PENDING as default if no entries exist at all", () => {
    const result = decideOutcome(null, [], []);
    expect(result.category).toBe("PENDING ⏳");
  });
});
