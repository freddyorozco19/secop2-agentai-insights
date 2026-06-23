import { NextResponse } from "next/server";
import { extractFromPDF, ExtractionError } from "@/lib/ai/extractor";
import { getProcessDocuments, downloadDocument } from "@/lib/secop/scraper";
import { ScraperError, SessionError } from "@/lib/secop/scraper";
import { CaptchaError } from "@/lib/secop/captcha";
import type { DocumentType } from "@/types/ai";

interface ExtractRequestBody {
  noticeUID: string;
  documentType?: DocumentType;
}

export async function POST(request: Request) {
  let body: ExtractRequestBody;
  try {
    body = (await request.json()) as ExtractRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido (se esperaba JSON)." },
      { status: 400 },
    );
  }

  const { noticeUID, documentType = "pliego" } = body;

  if (!noticeUID || typeof noticeUID !== "string") {
    return NextResponse.json(
      { error: "noticeUID es requerido." },
      { status: 400 },
    );
  }

  if (documentType !== "pliego" && documentType !== "estudios") {
    return NextResponse.json(
      { error: "documentType debe ser 'pliego' o 'estudios'." },
      { status: 400 },
    );
  }

  try {
    const documents = await getProcessDocuments(noticeUID);

    const targetDoc = documents[0];
    if (!targetDoc) {
      return NextResponse.json(
        { error: "No se encontraron documentos en el proceso." },
        { status: 404 },
      );
    }

    const { buffer, contentType } = await downloadDocument(
      targetDoc.documentFileId,
    );

    if (!contentType.includes("pdf") && buffer.length < 1000) {
      return NextResponse.json(
        { error: "El documento descargado no es un PDF válido." },
        { status: 422 },
      );
    }

    const fuenteDocumento = `${documentType}-${targetDoc.documentFileId}.pdf`;
    const resultado = await extractFromPDF(buffer, fuenteDocumento);

    return NextResponse.json({
      noticeUID,
      documentType,
      documentoFuente: fuenteDocumento,
      documentosEncontrados: documents.length,
      resultado,
    });
  } catch (error) {
    if (error instanceof CaptchaError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof SessionError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof ScraperError) {
      const status = error.retryable ? 503 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof ExtractionError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message =
      error instanceof Error ? error.message : "Error al extraer requisitos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
