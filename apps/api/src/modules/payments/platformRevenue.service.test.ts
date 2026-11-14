import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { recordPlatformRevenue } from "./platformRevenue.service";

function transactionClient(overrides: Record<string, unknown> = {}) {
  const tx = {
    platformRevenueEntry: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    platformRevenueAccount: {
      upsert: vi.fn().mockResolvedValue({ id: "account-ngn", balanceMinor: 0n }),
      update: vi.fn().mockResolvedValue({ id: "account-ngn", balanceMinor: 500n }),
    },
    ...overrides,
  };
  return tx as unknown as Prisma.TransactionClient & typeof tx;
}

describe("recordPlatformRevenue", () => {
  it("records a positive fee once and increments the currency account", async () => {
    const tx = transactionClient();
    await recordPlatformRevenue(tx, {
      amountMinor: 500n,
      currency: "NGN",
      refType: "BOOKING",
      refId: "booking-1",
      idempotencyKey: "platform_commission:booking-1",
    });
    expect(tx.platformRevenueAccount.upsert).toHaveBeenCalledWith({
      where: { currency: "NGN" },
      create: { currency: "NGN", balanceMinor: 0n },
      update: {},
    });
    expect(tx.platformRevenueAccount.update).toHaveBeenCalledWith({
      where: { id: "account-ngn" },
      data: { balanceMinor: { increment: 500n } },
    });
    expect(tx.platformRevenueEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "account-ngn",
        amountMinor: 500n,
        balanceAfterMinor: 500n,
        idempotencyKey: "platform_commission:booking-1",
      }),
    });
  });

  it("does not create or increment a duplicate idempotency key", async () => {
    const tx = transactionClient({
      platformRevenueEntry: { findUnique: vi.fn().mockResolvedValue({ id: "already-recorded" }), create: vi.fn() },
    });
    await recordPlatformRevenue(tx, {
      amountMinor: 500n,
      currency: "NGN",
      refType: "BOOKING",
      refId: "booking-1",
      idempotencyKey: "platform_commission:booking-1",
    });
    expect(tx.platformRevenueAccount.upsert).not.toHaveBeenCalled();
    expect(tx.platformRevenueAccount.update).not.toHaveBeenCalled();
    expect(tx.platformRevenueEntry.create).not.toHaveBeenCalled();
  });

  it("ignores zero or negative revenue entries", async () => {
    const tx = transactionClient();
    await recordPlatformRevenue(tx, {
      amountMinor: 0n,
      currency: "NGN",
      refType: "BOOKING",
      refId: "booking-1",
      idempotencyKey: "platform_commission:booking-1",
    });
    expect(tx.platformRevenueEntry.findUnique).not.toHaveBeenCalled();
    expect(tx.platformRevenueAccount.upsert).not.toHaveBeenCalled();
  });
});
