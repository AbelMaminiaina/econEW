-- Tentatives de paiement automatique : ajout d'Orange Money (page de paiement + jeton de notification)
ALTER TABLE "payment_attempts" ADD COLUMN "paymentUrl" TEXT,
ADD COLUMN "notifToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_notifToken_key" ON "payment_attempts"("notifToken");
