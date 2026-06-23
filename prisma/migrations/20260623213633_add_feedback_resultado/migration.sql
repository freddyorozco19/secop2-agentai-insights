/*
  Warnings:

  - Added the required column `updatedAt` to the `AnalisisHistorico` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalisisHistorico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "procesoObjeto" TEXT NOT NULL,
    "valorEstimado" REAL NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "nivel" TEXT NOT NULL,
    "modoAnalisis" TEXT NOT NULL,
    "brechasJson" TEXT NOT NULL,
    "seAplico" BOOLEAN NOT NULL DEFAULT false,
    "resultado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalisisHistorico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AnalisisHistorico" ("brechasJson", "createdAt", "id", "modoAnalisis", "nivel", "procesoObjeto", "puntaje", "tenantId", "valorEstimado") SELECT "brechasJson", "createdAt", "id", "modoAnalisis", "nivel", "procesoObjeto", "puntaje", "tenantId", "valorEstimado" FROM "AnalisisHistorico";
DROP TABLE "AnalisisHistorico";
ALTER TABLE "new_AnalisisHistorico" RENAME TO "AnalisisHistorico";
CREATE INDEX "AnalisisHistorico_tenantId_idx" ON "AnalisisHistorico"("tenantId");
CREATE INDEX "AnalisisHistorico_tenantId_createdAt_idx" ON "AnalisisHistorico"("tenantId", "createdAt");
CREATE INDEX "AnalisisHistorico_tenantId_resultado_idx" ON "AnalisisHistorico"("tenantId", "resultado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
