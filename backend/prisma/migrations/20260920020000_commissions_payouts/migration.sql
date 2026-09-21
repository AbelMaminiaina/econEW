-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('mvola', 'orange_money', 'airtel_money', 'bank_transfer');

-- AlterTable : commission propre au vendeur + coordonnées de reversement
ALTER TABLE "companies" ADD COLUMN "commissionRate" DOUBLE PRECISION,
ADD COLUMN "payoutMethod" "PayoutMethod",
ADD COLUMN "payoutNumber" TEXT,
ADD COLUMN "payoutAccountName" TEXT;

-- CreateTable : reversements aux vendeurs
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "commissionTotal" INTEGER NOT NULL,
    "ordersCount" INTEGER NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "paidByUserId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- AlterTable : commission figee a la confirmation du paiement + lien vers le reversement
ALTER TABLE "orders" ADD COLUMN "commissionRate" DOUBLE PRECISION,
ADD COLUMN "commissionAmount" INTEGER,
ADD COLUMN "sellerAmount" INTEGER,
ADD COLUMN "payoutId" TEXT;

-- CreateIndex
CREATE INDEX "payouts_sellerId_idx" ON "payouts"("sellerId");

-- CreateIndex
CREATE INDEX "orders_payoutId_idx" ON "orders"("payoutId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
