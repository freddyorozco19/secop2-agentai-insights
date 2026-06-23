import type { SecopProcess, SecopSearchResult } from "@/types/secop";
import { toSearchResult } from "@/types/secop";

const SOC_RESOURCE_BASE_URL =
  "https://www.datos.gov.co/resource/p6dx-8zbt.json";

const CACHE_TTL_SECONDS = 300;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_RETRIES = 3;

type UrlFieldValue = { url: string } | string | null;

function normalizeUrlproceso(value: UrlFieldValue): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url ?? null;
}

function normalizeProcess(raw: Record<string, unknown>): SecopProcess {
  return {
    ...(raw as unknown as SecopProcess),
    urlproceso: normalizeUrlproceso(
      (raw.urlproceso as UrlFieldValue) ?? null,
    ),
  };
}

export class SecopApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "SecopApiError";
  }
}

interface FetchOptions {
  signal?: AbortSignal;
  revalidate?: number;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const revalidate = options.revalidate ?? CACHE_TTL_SECONDS;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        signal: options.signal,
        next: { revalidate },
      });

      if (response.status === 429 || response.status === 503) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new SecopApiError(
          `Límite de peticiones alcanzado (status ${response.status}).`,
          response.status,
          true,
        );
      }

      if (!response.ok) {
        throw new SecopApiError(
          `Respuesta no exitosa de datos.gov.co (status ${response.status}).`,
          response.status,
          false,
        );
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (error instanceof SecopApiError && !error.retryable) {
        throw error;
      }
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw (
    lastError ??
    new SecopApiError("Error desconocido al consultar datos.gov.co.", 500, false)
  );
}

function escapeSoqlValue(value: string): string {
  return value.replace(/'/g, "''");
}

export async function fetchProcess(
  id: string,
  options: FetchOptions = {},
): Promise<SecopProcess | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;

  const url = `${SOC_RESOURCE_BASE_URL}?id_del_proceso=${encodeURIComponent(
    cleanId,
  )}&$limit=1`;

  const response = await fetchWithRetry(url, options);
  const data = (await response.json()) as Record<string, unknown>[];

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return normalizeProcess(data[0]);
}

export async function searchProcesses(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  options: FetchOptions = {},
): Promise<SecopSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  const safeLimit = Math.max(1, Math.min(limit, 50));
  const escaped = escapeSoqlValue(keyword);
  const where = `nombre_del_procedimiento like '%${escaped}%' OR descripci_n_del_procedimiento like '%${escaped}%'`;
  const url = `${SOC_RESOURCE_BASE_URL}?$where=${encodeURIComponent(
    where,
  )}&$limit=${safeLimit}`;

  const response = await fetchWithRetry(url, options);
  const data = (await response.json()) as Record<string, unknown>[];

  if (!Array.isArray(data)) return [];

  return data.map((raw) => toSearchResult(normalizeProcess(raw)));
}
