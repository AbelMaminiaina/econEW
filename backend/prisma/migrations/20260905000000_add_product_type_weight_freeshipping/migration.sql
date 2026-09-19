-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('vif', 'piece');

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'piece',
  ADD COLUMN "estimatedWeightKg" DOUBLE PRECISION,
  ADD COLUMN "freeShipping" BOOLEAN NOT NULL DEFAULT false;
