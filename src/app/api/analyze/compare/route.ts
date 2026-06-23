import { NextResponse } from "next/server";
import type { ProcesoEstructurado } from "@/types/ai";
import { compararProceso } from "@/lib/ai/comparator";
import { DUMMY_PROFILE } from "@/lib/company/dummyProfile";
import { extractFromPDF, ExtractionError } from "@/lib/ai/extractor";
import { getProcessDocuments, downloadDocument, ScraperError } from "@/lib/secop/scraper";
import { CaptchaError } from "@/lib/secop/captcha";
import { SessionError } from "@/lib/secop/session";

interface CompareRequestBody {
  proceso?: ProcesoEstructurado;
  noticeUID?: string;
  documentType?: "pliego" | "estudios";
  empresaId?: string;
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

  const { proceso, noticeUID, documentType = "pliego" } = body;

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

  const analisis = compararProceso(procesoEstructurado, DUMMY_PROFILE);

  return NextResponse.json(analisis);
}
