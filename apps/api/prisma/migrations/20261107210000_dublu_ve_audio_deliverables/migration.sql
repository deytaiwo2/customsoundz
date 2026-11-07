CREATE TABLE "BookingDeliveryAsset" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageRef" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingDeliveryAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingDeliveryAsset_storageRef_key"
    ON "BookingDeliveryAsset"("storageRef");
CREATE INDEX "BookingDeliveryAsset_bookingId_createdAt_idx"
    ON "BookingDeliveryAsset"("bookingId", "createdAt");
CREATE INDEX "BookingDeliveryAsset_uploadedById_createdAt_idx"
    ON "BookingDeliveryAsset"("uploadedById", "createdAt");

ALTER TABLE "BookingDeliveryAsset"
    ADD CONSTRAINT "BookingDeliveryAsset_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingDeliveryAsset"
    ADD CONSTRAINT "BookingDeliveryAsset_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
