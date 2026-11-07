ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ARTIST';

CREATE TABLE "ArtistProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "portfolio" JSONB,
  "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completedJobs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtistProfile_userId_key" ON "ArtistProfile"("userId");
CREATE INDEX "ArtistProfile_averageRating_idx" ON "ArtistProfile"("averageRating");
CREATE INDEX "ArtistProfile_completedJobs_idx" ON "ArtistProfile"("completedJobs");

ALTER TABLE "ArtistProfile"
ADD CONSTRAINT "ArtistProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
