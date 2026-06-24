-- CreateTable
CREATE TABLE "Tenant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "productCatalog" TEXT NOT NULL DEFAULT '',
    "priceList" TEXT NOT NULL DEFAULT '',
    "operatingHours" TEXT NOT NULL DEFAULT '08.00-22.00 WIB',
    "customPrompt" TEXT NOT NULL DEFAULT '',
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetaConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "wabaPhoneId" TEXT NOT NULL DEFAULT '',
    "wabaAccessToken" TEXT NOT NULL DEFAULT '',
    "wabaAppSecret" TEXT NOT NULL DEFAULT '',
    "verifyToken" TEXT NOT NULL DEFAULT '',
    "webhookActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MetaConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MetaConfig_tenantId_key" ON "MetaConfig"("tenantId");
