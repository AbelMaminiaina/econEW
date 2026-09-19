-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "sellerId" TEXT,
ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'approved',
ADD COLUMN "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "sellerId" TEXT,
ADD COLUMN "checkoutGroup" TEXT;

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");

-- CreateIndex
CREATE INDEX "orders_checkoutGroup_idx" ON "orders"("checkoutGroup");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
