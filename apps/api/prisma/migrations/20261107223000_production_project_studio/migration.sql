CREATE TABLE "ProductionProject" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "genre" TEXT NOT NULL,
  "mood" TEXT NOT NULL,
  "musicalKey" TEXT NOT NULL,
  "bpm" INTEGER NOT NULL,
  "duration" TEXT NOT NULL,
  "brief" TEXT,
  "services" JSONB NOT NULL,
  "estimatedTotalMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "assignedTeam" TEXT NOT NULL DEFAULT 'DUBLU_VE_PRODUCTION',
  "deliveryStorageRef" TEXT,
  "deliveryFileName" TEXT,
  "deliveryMimeType" TEXT,
  "deliverySizeBytes" BIGINT,
  "readyAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionProject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductionProject_reference_key" ON "ProductionProject"("reference");
CREATE INDEX "ProductionProject_customerId_createdAt_idx" ON "ProductionProject"("customerId", "createdAt");
CREATE INDEX "ProductionProject_status_createdAt_idx" ON "ProductionProject"("status", "createdAt");
ALTER TABLE "ProductionProject" ADD CONSTRAINT "ProductionProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
