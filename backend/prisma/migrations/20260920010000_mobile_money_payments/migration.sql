-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('mvola', 'orange_money', 'airtel_money');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('awaiting', 'submitted', 'paid', 'rejected');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'awaiting',
ADD COLUMN "paymentReference" TEXT,
ADD COLUMN "paymentPayerPhone" TEXT,
ADD COLUMN "paymentSubmittedAt" TIMESTAMP(3),
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "paymentRejectionReason" TEXT,
ADD COLUMN "stockReserved" BOOLEAN NOT NULL DEFAULT false;

-- Commandes existantes (avant le paiement en ligne) : considérées comme réglées, et leur stock
-- a déjà été décrémenté sauf pour les commandes en attente ou annulées.
UPDATE "orders"
SET "paymentStatus" = 'paid',
    "stockReserved" = ("status" NOT IN ('pending', 'cancelled'));

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "orders_paymentReference_idx" ON "orders"("paymentReference");
