ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

ALTER TABLE "Booking"
  ADD COLUMN "deliveryNote" TEXT,
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "disputedAt" TIMESTAMP(3),
  ADD COLUMN "disputeReason" TEXT;

CREATE INDEX "Booking_status_deliveredAt_idx"
  ON "Booking"("status", "deliveredAt");
