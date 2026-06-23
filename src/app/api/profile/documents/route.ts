import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePdf } from "@/lib/ai/extractor";
import { indexCompanyDocument } from "@/lib/rag/indexer";
import type { DocumentType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// Auth/onboarding llega en S11 — por ahora un tenant fijo para el piloto.
const DEFAULT_TENANT_ID = "techcorp-demo";

const VALID_TYPES = [
  "PERFIL_FINANCIERO",
  "CERTIFICACION",
  "HOJA_DE_VIDA",
  "EXPERIENCIA",
  "JURIDICO",
  "OTRO",
];

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { text } = await parsePdf(buffer);
    return text;
  }

  // txt / md u otros formatos de texto plano
  return buffer.toString("utf-8");
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? DEFAULT_TENANT_ID;

  const documentos = await prisma.companyDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documentos);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const tipo = formData.get("tipo")?.toString() ?? "OTRO";
    const nombre = formData.get("nombre")?.toString();
    const tenantId = formData.get("tenantId")?.toString() ?? DEFAULT_TENANT_ID;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo." },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo inválido. Usa uno de: ${VALID_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    let textoExtraido: string;
    try {
      textoExtraido = await extractText(file);
    } catch (err) {
      return NextResponse.json(
        {
          error: `No se pudo extraer texto del archivo: ${
            err instanceof Error ? err.message : "error desconocido"
          }`,
        },
        { status: 422 },
      );
    }

    const doc = await prisma.companyDocument.create({
      data: {
        tenantId,
        nombre: nombre || file.name,
        tipo: tipo as DocumentType,
        archivoUrl: file.name, // sin blob storage aún — ver pendientes en S9
        textoExtraido,
        indexStatus: "PENDIENTE",
      },
    });

    // Indexar en Qdrant. Si falla (ej. Qdrant no está corriendo), el documento
    // queda guardado con texto extraído pero status ERROR — no se pierde el upload.
    try {
      const { chunksIndexed } = await indexCompanyDocument(
        tenantId,
        DEFAULT_TENANT_ID, // clientId — un solo perfil de empresa por tenant en el piloto
        doc.id,
        textoExtraido,
      );
      const updated = await prisma.companyDocument.update({
        where: { id: doc.id },
        data: { indexStatus: "INDEXADO", chunksIndexed },
      });
      return NextResponse.json(updated, { status: 201 });
    } catch (err) {
      const updated = await prisma.companyDocument.update({
        where: { id: doc.id },
        data: {
          indexStatus: "ERROR",
          errorMensaje:
            err instanceof Error ? err.message : "Error desconocido al indexar.",
        },
      });
      return NextResponse.json(updated, { status: 201 });
    }
  } catch (err) {
    console.error("[profile/documents POST]", err);
    return NextResponse.json(
      { error: "Error al procesar el documento." },
      { status: 500 },
    );
  }
}
