import { NextResponse } from "next/server";
import {
  getProcessDocuments,
  ScraperError,
  SessionError,
} from "@/lib/secop/scraper";
import { CaptchaError } from "@/lib/secop/captcha";

async function delegateToService(noticeUID: string) {
  const serviceUrl = process.env.SCRAPER_SERVICE_URL;
  if (!serviceUrl) return null;

  const response = await fetch(
    `${serviceUrl.replace(/\/$/, "")}/documents/${encodeURIComponent(noticeUID)}`,
    { signal: AbortSignal.timeout(60_000) },
  );
  return response;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ noticeUID: string }> },
) {
  const { noticeUID: rawId } = await context.params;
  const noticeUID = decodeURIComponent(rawId).trim();

  if (!noticeUID) {
    return NextResponse.json(
      { error: "El noticeUID es requerido." },
      { status: 400 },
    );
  }

  try {
    const serviceResponse = await delegateToService(noticeUID);
    if (serviceResponse) {
      const data = await serviceResponse.json();
      return NextResponse.json(data, { status: serviceResponse.status });
    }

    const documents = await getProcessDocuments(noticeUID);
    return NextResponse.json({ noticeUID, count: documents.length, documents });
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
    const message =
      error instanceof Error ? error.message : "Error al obtener documentos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
