import { BookingStatus, LedgerType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { env } from "../../config/env";
import { assertEscrowReleaseAllowed } from "./escrowPolicy";
import { recordPlatformRevenue } from "./platformRevenue.service";

/**
 * Release booking escrow to the provider.
 * Event-linked bookings retain the assigned-verifier gate. Standalone Dublu Vé
 * orders can be released only by the customer after the provider marks delivery,
 * or by an administrator resolving a recorded dispute.
 */
export async function releaseBookingEscrow(
  bookingId: string,
  actorUserId: string,
  options: { allowDisputedAdmin?: boolean } = {},
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vendor: true },
  });
  if (!booking) throw new HttpError(404, "NOT_FOUND", "Booking not found");
  if (booking.status === BookingStatus.FULFILLED) {
    return {
      status: "FULFILLED" as const,
      bookingId: booking.id,
      vendorNetMinor: (booking.totalMinor - booking.commissionMinor).toString(),
      commissionMinor: booking.commissionMinor.toString(),
      currency: booking.currency,
      alreadyReleased: true,
    };
  }
  if (booking.status === BookingStatus.REFUNDED) {
    throw new HttpError(409, "BOOKING_REFUNDED", "A refunded booking cannot release escrow");
  }

  if (booking.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: booking.eventId },
      include: {
        readiness: { select: { assignedVerifierId: true } },
        serviceChecks: { select: { status: true } },
      },
    });
    if (!event) throw new HttpError(409, "EVENT_REQUIRED", "Booking event is not available for verifier confirmation");
    assertEscrowReleaseAllowed({
      actorUserId,
      assignedVerifierId: event.readiness?.assignedVerifierId ?? null,
      eventStatus: event.status,
      eventEndsAt: event.endsAt,
      checkCount: event.serviceChecks.length,
      greenCount: event.serviceChecks.filter((check) => check.status === "GREEN").length,
    });
  } else if (options.allowDisputedAdmin) {
    if (booking.status !== BookingStatus.DISPUTED) {
      throw new HttpError(409, "DISPUTE_REQUIRED", "Admin override is available only for disputed bookings");
    }
  } else {
    if (booking.buyerId !== actorUserId) {
      throw new HttpError(403, "FORBIDDEN", "Only the customer who placed this order can approve its delivery");
    }
    if (booking.status !== BookingStatus.DELIVERED) {
      throw new HttpError(409, "DELIVERY_NOT_READY", "The provider must mark the order delivered before you can approve it");
    }
  }

  if (
    booking.status !== BookingStatus.PAID &&
    booking.status !== BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.DELIVERED &&
    booking.status !== BookingStatus.DISPUTED
  ) {
    throw new HttpError(400, "INVALID_STATE", `Cannot release from status ${booking.status}`);
  }
  if (booking.status === BookingStatus.DISPUTED && !options.allowDisputedAdmin) {
    throw new HttpError(409, "BOOKING_DISPUTED", "This booking is under dispute and cannot be released");
  }

  const vendorUserId = booking.vendor.userId;
  const bps = env.COMMISSION_BPS;
  // Prefer stored commission; recompute if zero
  let commission = booking.commissionMinor;
  if (commission === 0n && bps > 0) {
    commission = (booking.totalMinor * BigInt(bps) + 5000n) / 10000n;
  }
  const vendorNet = booking.totalMinor - commission;
  const currency = booking.currency;
  const idempotencyKey = `release:${booking.id}`;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
    if (existing) {
      await recordPlatformRevenue(tx, {
        amountMinor: commission,
        currency,
        refType: "BOOKING",
        refId: booking.id,
        idempotencyKey: `platform_commission:${booking.id}`,
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.FULFILLED, commissionMinor: commission },
      });
      return;
    }

    const buyerWallet = await tx.wallet.findUnique({
      where: { userId_currency: { userId: booking.buyerId, currency } },
    });
    if (!buyerWallet || buyerWallet.escrowMinor < booking.totalMinor) {
      throw new HttpError(
        409,
        "ESCROW_BALANCE_MISMATCH",
        "The payer's escrow balance does not cover this booking; release was blocked",
      );
    }
    const newEscrow = buyerWallet.escrowMinor - booking.totalMinor;
    await tx.ledgerEntry.create({
      data: {
        walletId: buyerWallet.id,
        type: LedgerType.ESCROW_RELEASE,
        amountMinor: booking.totalMinor,
        balanceAfterMinor: buyerWallet.availableMinor,
        refType: "BOOKING",
        refId: booking.id,
        idempotencyKey,
      },
    });
    await tx.wallet.update({
      where: { id: buyerWallet.id },
      data: { escrowMinor: newEscrow },
    });

    let vendorWallet = await tx.wallet.findUnique({
      where: { userId_currency: { userId: vendorUserId, currency } },
    });
    if (!vendorWallet) {
      vendorWallet = await tx.wallet.create({
        data: { userId: vendorUserId, currency, availableMinor: 0n, escrowMinor: 0n },
      });
    }
    const vendorBal = vendorWallet.availableMinor + vendorNet;
    await tx.ledgerEntry.create({
      data: {
        walletId: vendorWallet.id,
        type: LedgerType.ESCROW_RELEASE,
        amountMinor: vendorNet,
        balanceAfterMinor: vendorBal,
        refType: "BOOKING",
        refId: booking.id,
        idempotencyKey: `vendor_release:${booking.id}`,
      },
    });
    if (commission > 0n) {
      await tx.ledgerEntry.create({
        data: {
          walletId: vendorWallet.id,
          type: LedgerType.COMMISSION,
          amountMinor: commission,
          balanceAfterMinor: vendorBal,
          refType: "BOOKING",
          refId: booking.id,
          idempotencyKey: `commission:${booking.id}`,
        },
      });
    }
    await tx.wallet.update({
      where: { id: vendorWallet.id },
      data: { availableMinor: vendorBal },
    });
    await recordPlatformRevenue(tx, {
      amountMinor: commission,
      currency,
      refType: "BOOKING",
      refId: booking.id,
      idempotencyKey: `platform_commission:${booking.id}`,
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.FULFILLED,
        commissionMinor: commission,
      },
    });
  });

  return {
    status: "FULFILLED" as const,
    bookingId: booking.id,
    vendorNetMinor: vendorNet.toString(),
    commissionMinor: commission.toString(),
    currency,
    alreadyReleased: false,
  };
}


/** Refund a disputed booking's held amount to the customer. Admin-only caller. */
export async function refundDisputedBookingEscrow(bookingId: string, actorUserId: string, reason: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new HttpError(404, "NOT_FOUND", "Booking not found");
  if (booking.status === BookingStatus.REFUNDED) {
    return { status: "REFUNDED" as const, bookingId: booking.id, amountMinor: booking.paidMinor.toString(), currency: booking.currency, alreadyRefunded: true };
  }
  if (booking.status !== BookingStatus.DISPUTED) {
    throw new HttpError(409, "DISPUTE_REQUIRED", "Only a disputed booking can be refunded through dispute resolution");
  }
  if (booking.paidMinor <= 0n) throw new HttpError(409, "NOTHING_TO_REFUND", "This booking has no paid amount to refund");
  const amount = booking.paidMinor;
  const idempotencyKey = `refund:${booking.id}`;

  await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
    if (current.status === BookingStatus.REFUNDED) return;
    if (current.status !== BookingStatus.DISPUTED) {
      throw new HttpError(409, "DISPUTE_REQUIRED", "Booking dispute status changed before refund");
    }
    const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
    if (existing) {
      await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.REFUNDED } });
      return;
    }
    const wallet = await tx.wallet.findUnique({
      where: { userId_currency: { userId: booking.buyerId, currency: booking.currency } },
    });
    if (!wallet || wallet.escrowMinor < amount) {
      throw new HttpError(409, "ESCROW_BALANCE_MISMATCH", "The customer's escrow balance does not cover this refund");
    }
    const nextAvailable = wallet.availableMinor + amount;
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: LedgerType.ESCROW_REFUND,
        amountMinor: amount,
        balanceAfterMinor: nextAvailable,
        refType: "BOOKING",
        refId: booking.id,
        idempotencyKey,
      },
    });
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { availableMinor: nextAvailable, escrowMinor: wallet.escrowMinor - amount },
    });
    await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.REFUNDED } });
    await tx.auditLog.create({
      data: {
        actorId: actorUserId,
        action: "BOOKING_ESCROW_REFUNDED",
        entity: "Booking",
        entityId: booking.id,
        meta: { reason: reason.slice(0, 1000), amountMinor: amount.toString(), currency: booking.currency },
      },
    });
  }, { isolationLevel: "Serializable" });

  return { status: "REFUNDED" as const, bookingId: booking.id, amountMinor: amount.toString(), currency: booking.currency, alreadyRefunded: false };
}
