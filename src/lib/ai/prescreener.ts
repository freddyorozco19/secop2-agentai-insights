import type { SecopProcess } from "@/types/secop";
import type { EmpresaProfile } from "@/types/company";

export interface PreScreenResult {
  proceso: SecopProcess;
  score: number;
  nivel: "ALTA" | "MEDIA" | "BAJA";
  factores: {
    presupuesto: number;
    relevancia: number;
    modalidad: number;
    estado: number;
  };
}

// Pesos máximos por factor (suma 100)
const PESOS = { presupuesto: 30, relevancia: 40, modalidad: 15, estado: 15 };

// Palabras clave del sector TI — en producción vendrán del perfil de la empresa
const TI_KEYWORDS = [
  "software",
  "sistem",
  "plataforma",
  "tecnolog",
  "digital",
  " dato",
  "consultor",
  " ti ",
  "informaci",
  "desarrollo",
  "aplicac",
  "portal",
  "nube",
  "cloud",
  "infraestructura",
  "base de dato",
  "analítica",
  "inteligencia",
  "automatizac",
  "ciberseguridad",
];

function scorePresupuesto(
  precio: number | null,
  empresa: EmpresaProfile,
): number {
  if (!precio || precio <= 0) return Math.round(PESOS.presupuesto * 0.33);

  const ingresos = empresa.capacidadFinanciera.ingresoOperacional;
  const patrimonio = empresa.capacidadFinanciera.patrimonioLiquido;

  // Rango ideal: 10% a 150% de ingresos operacionales
  const min = ingresos * 0.1;
  const max = ingresos * 1.5;

  if (precio >= min && precio <= max) return PESOS.presupuesto;
  if (precio >= min * 0.5 && precio <= max * 2) return Math.round(PESOS.presupuesto * 0.67);
  if (precio > patrimonio * 3) return 0; // demasiado grande para la empresa
  return Math.round(PESOS.presupuesto * 0.27);
}

function scoreRelevancia(proceso: SecopProcess): number {
  const texto = [
    proceso.nombre_del_procedimiento ?? "",
    proceso.descripci_n_del_procedimiento ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (!texto.trim()) return Math.round(PESOS.relevancia * 0.25);

  const matches = TI_KEYWORDS.filter((kw) => texto.includes(kw)).length;

  if (matches >= 4) return PESOS.relevancia;
  if (matches >= 2) return Math.round(PESOS.relevancia * 0.7);
  if (matches >= 1) return Math.round(PESOS.relevancia * 0.38);
  return Math.round(PESOS.relevancia * 0.13);
}

const SCORES_MODALIDAD: [string, number][] = [
  ["concurso de méritos", PESOS.modalidad],
  ["contratación directa", PESOS.modalidad],
  ["selección abreviada", Math.round(PESOS.modalidad * 0.8)],
  ["mínima cuantía", Math.round(PESOS.modalidad * 0.67)],
  ["licitación pública", Math.round(PESOS.modalidad * 0.53)],
];

function scoreModalidad(proceso: SecopProcess): number {
  const m = (proceso.modalidad_de_contratacion ?? "").toLowerCase();
  for (const [key, pts] of SCORES_MODALIDAD) {
    if (m.includes(key)) return pts;
  }
  return Math.round(PESOS.modalidad * 0.33);
}

function scoreEstado(proceso: SecopProcess): number {
  const apertura = (proceso.estado_de_apertura_del_proceso ?? "").toLowerCase();
  const estado = (proceso.estado_del_procedimiento ?? "").toLowerCase();

  if (apertura.includes("abierto")) return PESOS.estado;
  if (estado.includes("publicado") || estado.includes("activo"))
    return Math.round(PESOS.estado * 0.67);
  return Math.round(PESOS.estado * 0.2);
}

export function prescreener(
  proceso: SecopProcess,
  empresa: EmpresaProfile,
): PreScreenResult {
  const factores = {
    presupuesto: scorePresupuesto(proceso.precio_base, empresa),
    relevancia: scoreRelevancia(proceso),
    modalidad: scoreModalidad(proceso),
    estado: scoreEstado(proceso),
  };

  const score = Math.min(
    100,
    Object.values(factores).reduce((a, b) => a + b, 0),
  );

  const nivel: "ALTA" | "MEDIA" | "BAJA" =
    score >= 70 ? "ALTA" : score >= 45 ? "MEDIA" : "BAJA";

  return { proceso, score, nivel, factores };
}

export function prescreenBatch(
  procesos: SecopProcess[],
  empresa: EmpresaProfile,
): PreScreenResult[] {
  return procesos
    .map((p) => prescreener(p, empresa))
    .sort((a, b) => b.score - a.score);
}
