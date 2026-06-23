import type { SecopProcess } from "@/types/secop";
import { SecopApiError } from "@/lib/secop/api";

const SOC_BASE = "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type UrlFieldValue = { url: string } | string | null;

function normalizeUrl(value: UrlFieldValue): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url ?? null;
}

function normalizeProcess(raw: Record<string, unknown>): SecopProcess {
  return {
    ...(raw as unknown as SecopProcess),
    urlproceso: normalizeUrl((raw.urlproceso as UrlFieldValue) ?? null),
    precio_base: raw.precio_base != null ? Number(raw.precio_base) : null,
  };
}

/** Último día hábil con datos disponibles — el API de Socrata tiene ~1 día de delay y no publica fines de semana. */
export function lastWorkingDayISO(): string {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  const dow = d.getUTCDay();
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2);
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

export interface DiscoveryFilters {
  fecha: string; // YYYY-MM-DD
  modalidad?: string;
  tipoContrato?: string;
  presupuestoMin?: number;
  presupuestoMax?: number;
  soloActivos?: boolean;
}

export const MODALIDADES = [
  "Licitación pública",
  "Selección abreviada",
  "Concurso de méritos",
  "Contratación directa",
  "Mínima cuantía",
  "Asociación público privada",
];

export async function fetchProcessesByDate(
  filters: DiscoveryFilters,
): Promise<SecopProcess[]> {
  const {
    fecha,
    modalidad,
    tipoContrato,
    presupuestoMin,
    presupuestoMax,
    soloActivos = true,
  } = filters;

  const dateStart = `${fecha}T00:00:00.000`;
  const dateEnd = `${fecha}T23:59:59.999`;

  const conditions: string[] = [
    `fecha_de_publicacion_del >= '${dateStart}'`,
    `fecha_de_publicacion_del <= '${dateEnd}'`,
  ];

  if (soloActivos) {
    conditions.push(`estado_de_apertura_del_proceso = 'Abierto'`);
  }

  if (modalidad) {
    conditions.push(
      `modalidad_de_contratacion = '${modalidad.replace(/'/g, "''")}'`,
    );
  }

  if (tipoContrato) {
    conditions.push(
      `tipo_de_contrato = '${tipoContrato.replace(/'/g, "''")}'`,
    );
  }

  if (presupuestoMin != null) {
    conditions.push(`precio_base >= ${presupuestoMin}`);
  }

  if (presupuestoMax != null) {
    conditions.push(`precio_base <= ${presupuestoMax}`);
  }

  const where = conditions.join(" AND ");
  const all: SecopProcess[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const url = `${SOC_BASE}?$where=${encodeURIComponent(where)}&$limit=${PAGE_SIZE}&$offset=${offset}&$order=precio_base DESC`;

    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) {
      if (page === 0) {
        throw new SecopApiError(
          `Error consultando datos.gov.co (${response.status})`,
          response.status,
          response.status >= 500,
        );
      }
      break;
    }

    const data = (await response.json()) as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) break;

    all.push(...data.map(normalizeProcess));
    if (data.length < PAGE_SIZE) break;
  }

  return all;
}
