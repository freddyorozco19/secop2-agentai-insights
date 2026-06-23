-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "sector" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ANALISTA',
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompanyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "textoExtraido" TEXT,
    "indexStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "chunksIndexed" INTEGER NOT NULL DEFAULT 0,
    "errorMensaje" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanyDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CompanyDocument" ("archivoUrl", "chunksIndexed", "createdAt", "errorMensaje", "id", "indexStatus", "nombre", "tenantId", "textoExtraido", "tipo", "updatedAt") SELECT "archivoUrl", "chunksIndexed", "createdAt", "errorMensaje", "id", "indexStatus", "nombre", "tenantId", "textoExtraido", "tipo", "updatedAt" FROM "CompanyDocument";
DROP TABLE "CompanyDocument";
ALTER TABLE "new_CompanyDocument" RENAME TO "CompanyDocument";
CREATE INDEX "CompanyDocument_tenantId_idx" ON "CompanyDocument"("tenantId");
CREATE INDEX "CompanyDocument_tenantId_tipo_idx" ON "CompanyDocument"("tenantId", "tipo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
