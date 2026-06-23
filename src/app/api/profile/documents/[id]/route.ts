import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteByRef } from "@/lib/rag/qdrant";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.companyDocument.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }
  if (doc.tenantId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    await deleteByRef(doc.tenantId, "client", doc.tenantId, doc.id);
  } catch (err) {
    console.error("[profile/documents DELETE] error al limpiar Qdrant:", err);
    // Continuamos con el borrado en BD aunque Qdrant falle — no debe bloquear al usuario.
  }

  await prisma.companyDocument.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
