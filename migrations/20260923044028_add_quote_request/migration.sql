-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "fromLocation" TEXT NOT NULL DEFAULT '',
    "toLocation" TEXT NOT NULL DEFAULT '',
    "serviceType" TEXT,
    "serviceTypeLabel" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "howHeardFromUs" TEXT,
    "details" TEXT NOT NULL DEFAULT '',
    "language" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequest_serviceType_idx" ON "QuoteRequest"("serviceType");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_serviceType_fkey" FOREIGN KEY ("serviceType") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

