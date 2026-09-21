-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('pending', 'completed', 'failed', 'review');

-- CreateTable : tentatives de paiement automatique via l'API d'un operateur (MVola Merchant Pay)
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "checkoutGroup" TEXT,
    "amount" INTEGER NOT NULL,
    "payerPhone" TEXT NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'pending',
    "serverCorrelationId" TEXT,
    "transactionId" TEXT,
    "providerStatus" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_serverCorrelationId_key" ON "payment_attempts"("serverCorrelationId");

-- CreateIndex
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts"("status");

-- CreateIndex
CREATE INDEX "payment_attempts_orderId_idx" ON "payment_attempts"("orderId");

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
