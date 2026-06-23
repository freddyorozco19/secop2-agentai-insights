-- CreateTable
CREATE TABLE "CompanyDocument" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CompanyDocument_tenantId_idx" ON "CompanyDocument"("tenantId");

-- CreateIndex
CREATE INDEX "CompanyDocument_tenantId_tipo_idx" ON "CompanyDocument"("tenantId", "tipo");
