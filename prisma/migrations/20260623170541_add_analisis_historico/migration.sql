-- CreateTable
CREATE TABLE "AnalisisHistorico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "procesoObjeto" TEXT NOT NULL,
    "valorEstimado" REAL NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "nivel" TEXT NOT NULL,
    "modoAnalisis" TEXT NOT NULL,
    "brechasJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalisisHistorico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalisisHistorico_tenantId_idx" ON "AnalisisHistorico"("tenantId");

-- CreateIndex
CREATE INDEX "AnalisisHistorico_tenantId_createdAt_idx" ON "AnalisisHistorico"("tenantId", "createdAt");
