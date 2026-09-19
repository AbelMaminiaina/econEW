-- AlterTable
ALTER TABLE "orders" ADD COLUMN "guestName" TEXT,
ADD COLUMN "guestEmail" TEXT,
ADD COLUMN "guestPhone" TEXT;

-- CreateIndex
CREATE INDEX "orders_guestEmail_idx" ON "orders"("guestEmail");
