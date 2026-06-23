import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteByRef } from "@/lib/rag/qdrant";

const DEFAULT_TENANT_ID = "techcorp-demo";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const doc = await prisma.companyDocument.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  try {
    await deleteByRef(doc.tenantId, "client", DEFAULT_TENANT_ID, doc.id);
  } catch (err) {
    console.error("[profile/documents DELETE] error al limpiar Qdrant:", err);
    // Continuamos con el borrado en BD aunque Qdrant falle — no debe bloquear al usuario.
  }

  await prisma.companyDocument.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
