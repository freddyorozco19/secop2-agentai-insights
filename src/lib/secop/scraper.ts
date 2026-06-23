import {
  getSession,
  buildCookieString,
  clearSession,
  SecopSession,
  SessionError,
} from "./session";

export class ScraperError extends Error {
  constructor(message: string, readonly retryable: boolean = false) {
    super(message);
    this.name = "ScraperError";
  }
}

export interface ProcessDocument {
  name: string;
  documentFileId: string;
  size?: number;
}

function getBaseUrl(): string {
  return (
    process.env.SCRAPER_BASE_URL ?? "https://community.secop.gov.co"
  ).replace(/\/$/, "");
}

function parseDocumentIds(html: string): ProcessDocument[] {
  const docs: ProcessDocument[] = [];
  const seen = new Set<string>();

  const patterns = [
    /documentFileId[=:'"\s]*([0-9a-f-]{36})/gi,
    /data-document-file-id=["']([0-9a-f-]{36})["']/gi,
    /documentFileId=([0-9a-f-]{36})/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      if (!seen.has(id)) {
        seen.add(id);
        docs.push({ name: `Documento ${docs.length + 1}`, documentFileId: id });
      }
    }
  }

  const namePattern =
    /(?:data-file-name|data-name|title)=["']([^"']+)["'][^>]*data-document-file-id=["']([0-9a-f-]{36})["']/gi;
  let nameMatch;
  while ((nameMatch = namePattern.exec(html)) !== null) {
    const id = nameMatch[2];
    const existing = docs.find((d) => d.documentFileId === id);
    if (existing) {
      existing.name = nameMatch[1];
    }
  }

  return docs;
}

async function fetchWithSession(
  url: string,
  session: SecopSession,
  options?: { method?: string; redirect?: RequestRedirect },
): Promise<Response> {
  return fetch(url, {
    method: options?.method ?? "GET",
    redirect: options?.redirect ?? "manual",
    headers: {
      Cookie: buildCookieString(session),
      "User-Agent": "Mozilla/5.0",
    },
  });
}

async function withSessionRetry<T>(
  operation: (session: SecopSession) => Promise<T>,
): Promise<T> {
  let session = await getSession();
  try {
    return await operation(session);
  } catch (error) {
    if (error instanceof ScraperError && error.retryable) {
      clearSession();
      session = await getSession();
      return await operation(session);
    }
    throw error;
  }
}

function isCaptchaRedirect(response: Response): boolean {
  const location = response.headers.get("location") ?? "";
  return (
    response.status === 302 &&
    location.includes("GoogleReCaptcha")
  );
}

export async function getProcessDocuments(
  noticeUID: string,
): Promise<ProcessDocument[]> {
  const cleanId = noticeUID.trim();
  if (!cleanId) return [];

  return withSessionRetry(async (session) => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/Public/Tendering/OpportunityDetail/Index?noticeUID=${encodeURIComponent(cleanId)}`;

    const response = await fetchWithSession(url, session);

    if (isCaptchaRedirect(response)) {
      throw new ScraperError("Sesión expirada, se requiere renovar CAPTCHA.", true);
    }

    if (response.status === 302) {
      const location = response.headers.get("location") ?? "";
      throw new ScraperError(
        `Redirección inesperada a ${location}. El proceso podría no existir.`,
        false,
      );
    }

    if (!response.ok) {
      throw new ScraperError(
        `Error al obtener la página del proceso (status ${response.status}).`,
        false,
      );
    }

    const html = await response.text();
    const docs = parseDocumentIds(html);

    if (docs.length === 0) {
      throw new ScraperError(
        "No se encontraron documentos en la página del proceso.",
        false,
      );
    }

    return docs;
  });
}

export async function downloadDocument(
  documentFileId: string,
  mkey?: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  return withSessionRetry(async (session) => {
    const baseUrl = getBaseUrl();
    const effectiveMkey = mkey ?? session.mkey;

    const downloadUrl = `${baseUrl}/DownloadFile?documentFileId=${encodeURIComponent(documentFileId)}&mkey=${encodeURIComponent(effectiveMkey)}`;
    const downloadResponse = await fetchWithSession(downloadUrl, session, {
      redirect: "manual",
    });

    if (isCaptchaRedirect(downloadResponse)) {
      throw new ScraperError("Sesión expirada durante descarga.", true);
    }

    let finalUrl: string;
    if (downloadResponse.status === 302) {
      const location = downloadResponse.headers.get("location") ?? "";
      finalUrl = location.startsWith("http")
        ? location
        : `${baseUrl}${location}`;
    } else if (downloadResponse.ok) {
      const data = (await downloadResponse.json()) as { url?: string };
      if (!data.url) {
        throw new ScraperError(
          "DownloadFile no retornó URL del archivo.",
          false,
        );
      }
      finalUrl = data.url;
    } else {
      throw new ScraperError(
        `DownloadFile falló (status ${downloadResponse.status}).`,
        false,
      );
    }

    const fileResponse = await fetchWithSession(finalUrl, session, {
      redirect: "follow",
    });

    if (!fileResponse.ok) {
      throw new ScraperError(
        `Descarga del archivo falló (status ${fileResponse.status}).`,
        false,
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const contentType =
      fileResponse.headers.get("content-type") ?? "application/octet-stream";

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  });
}

export { SessionError };
