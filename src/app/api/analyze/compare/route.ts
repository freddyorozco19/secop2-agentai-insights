import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ProcesoEstructurado } from "@/types/ai";
import { compararProceso } from "@/lib/ai/comparator";
import { DUMMY_PROFILE } from "@/lib/company/dummyProfile";
import { extractFromPDF, ExtractionError } from "@/lib/ai/extractor";
import { getProcessDocuments, downloadDocument, ScraperError } from "@/lib/secop/scraper";
import { CaptchaError } from "@/lib/secop/captcha";
import { SessionError } from "@/lib/secop/session";
import { analizarConRAG, RAGAgentError } from "@/lib/rag/agent";

interface CompareRequestBody {
  proceso?: ProcesoEstructurado;
  noticeUID?: string;
  documentType?: "pliego" | "estudios";
  empresaId?: string;
  /** Si es true, compara contra los documentos reales del cliente (S8/S9) en vez del perfil dummy. Requiere sesión. */
  useRAG?: boolean;
}

export async function POST(request: Request) {
  let body: CompareRequestBody;
  try {
    body = (await request.json()) as CompareRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido (se esperaba JSON)." },
      { status: 400 },
    );
  }

  const { proceso, noticeUID, documentType = "pliego", useRAG = false } = body;

  if (useRAG) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "El análisis con RAG requiere iniciar sesión." },
        { status: 401 },
      );
    }
  }

  if (!proceso && !noticeUID) {
    return NextResponse.json(
      { error: "Se requiere 'proceso' (ProcesoEstructurado) o 'noticeUID'." },
      { status: 400 },
    );
  }

  let procesoEstructurado: ProcesoEstructurado;

  if (proceso) {
    procesoEstructurado = proceso;
  } else {
    try {
      const documents = await getProcessDocuments(noticeUID!);
      const targetDoc = documents[0];
      if (!targetDoc) {
        return NextResponse.json(
          { error: "No se encontraron documentos en el proceso." },
          { status: 404 },
        );
      }
      const { buffer } = await downloadDocument(targetDoc.documentFileId);
      const fuente = `${documentType}-${targetDoc.documentFileId}.pdf`;
      procesoEstructurado = await extractFromPDF(buffer, fuente);
    } catch (error) {
      if (error instanceof CaptchaError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      if (error instanceof SessionError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      if (error instanceof ScraperError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      if (error instanceof ExtractionError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
      const message =
        error instanceof Error ? error.message : "Error al obtener proceso.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (useRAG) {
    try {
      const session = await getServerSession(authOptions);
      const company = await prisma.company.findUnique({
        where: { id: session!.user.companyId },
      });
      const analisis = await analizarConRAG(
        procesoEstructurado,
        session!.user.companyId,
        company?.nombre,
        company?.nit ?? undefined,
      );
      return NextResponse.json(analisis);
    } catch (error) {
      if (error instanceof RAGAgentError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      const message =
        error instanceof Error ? error.message : "Error en el análisis RAG.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const analisis = compararProceso(procesoEstructurado, DUMMY_PROFILE);

  return NextResponse.json(analisis);
}
