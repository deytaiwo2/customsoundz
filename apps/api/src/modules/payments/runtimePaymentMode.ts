import type { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";

export const PAYMENT_MODES = ["demo", "test", "live"] as const;
export type PaymentMode = typeof PAYMENT_MODES[number];

let activeMode: PaymentMode = process.env.NODE_ENV === "test" ? "test" : "demo";
const requestMode = new AsyncLocalStorage<PaymentMode>();

/** Refresh the shared setting on each payment API request; fail closed on DB errors. */
export async function refreshPaymentMode(): Promise<PaymentMode> {
  const setting = await prisma.platformRuntimeSetting.findUnique({
    where: { id: "global" },
    select: { paymentMode: true },
  });
  const mode = setting?.paymentMode;
  if (!PAYMENT_MODES.includes(mode as PaymentMode)) {
    throw new Error("The central payment mode is missing or invalid");
  }
  activeMode = mode as PaymentMode;
  return activeMode;
}

export function getRuntimePaymentMode(): PaymentMode {
  return requestMode.getStore() ?? activeMode;
}

/** Serialize payment-intent creation against administrator mode changes. */
export async function lockCurrentPaymentMode(tx: Prisma.TransactionClient): Promise<PaymentMode> {
  if (process.env.NODE_ENV === "test") return getRuntimePaymentMode();
  await tx.$queryRaw`SELECT "id" FROM "PlatformRuntimeSetting" WHERE "id" = 'global' FOR UPDATE`;
  const setting = await tx.platformRuntimeSetting.findUnique({
    where: { id: "global" },
    select: { paymentMode: true },
  });
  const requestModeSnapshot = getRuntimePaymentMode();
  if (!setting || setting.paymentMode !== requestModeSnapshot) {
    throw new HttpError(409, "PAYMENT_MODE_CHANGED_RETRY", "The global payment mode changed while this request was starting. Refresh and try again.");
  }
  return setting.paymentMode as PaymentMode;
}

export async function paymentModeGuard(_req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "test") {
    const requested = process.env.RUN_DB_TESTS === "1" ? _req.get("x-dubluve-test-payment-mode") : undefined;
    const testMode = PAYMENT_MODES.includes(requested as PaymentMode) ? requested as PaymentMode : "test";
    res.setHeader("Cache-Control", "no-store");
    requestMode.run(testMode, next);
    return;
  }
  try {
    const mode = await refreshPaymentMode();
    res.setHeader("Cache-Control", "no-store");
    requestMode.run(mode, next);
  } catch {
    next(new HttpError(503, "PAYMENT_MODE_UNAVAILABLE", "Dublu Vé cannot verify its central payment mode. Payment operations are temporarily paused."));
  }
}
