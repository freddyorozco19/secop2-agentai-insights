export interface HabilitanteFinanciero {
  campo: string;
  operador: string;
  valor: number;
  fuente: string;
}

export interface ExperienciaRequerida {
  descripcion: string;
  cantidadContratos: number;
  valorMinimo: number | null;
  anosMaximos: number | null;
}

export interface EquipoRequerido {
  rol: string;
  requisitos: string[];
}

export interface CronogramaEtapa {
  etapa: string;
  fecha: string;
}

export interface ProcesoEstructurado {
  objeto: string;
  valorEstimado: number;
  fechaCierre: string | null;
  modalidad: string;
  duracion: string;
  habilitantesJuridicos: string[];
  habilitantesFinancieros: HabilitanteFinanciero[];
  habilitantesTecnicos: string[];
  experienciaRequerida: ExperienciaRequerida[];
  equipoRequerido: EquipoRequerido[];
  certificacionesRequeridas: string[];
  cronograma: CronogramaEtapa[];
  fuenteDocumento: string;
}

export type DocumentType = "pliego" | "estudios";

export type EstadoRequisito = "CUMPLE" | "NO_CUMPLE" | "PARCIAL" | "NO_APLICA";

export type CategoriaRequisito =
  | "JURIDICO"
  | "FINANCIERO"
  | "TECNICO"
  | "EXPERIENCIA"
  | "EQUIPO"
  | "CERTIFICACION";

export type NivelViabilidad = "ALTA" | "MEDIA" | "BAJA" | "MUY_BAJA";

export interface BrechaRequisito {
  requisito: string;
  categoria: CategoriaRequisito;
  estado: EstadoRequisito;
  detalle: string;
  recomendacion: string;
  peso: number;
}

export interface AnalisisViabilidad {
  proceso: {
    objeto: string;
    valorEstimado: number;
    modalidad: string;
    fuenteDocumento: string;
  };
  empresa: {
    nombre: string;
    nit: string;
  };
  puntaje: number;
  nivel: NivelViabilidad;
  brechas: BrechaRequisito[];
  resumenEjecutivo: string;
  recomendaciones: string[];
}

export const PESOS_POR_CATEGORIA = {
  FINANCIERO: 30,
  EXPERIENCIA: 35,
  EQUIPO: 12,
  CERTIFICACION: 8,
  JURIDICO: 15,
  TECNICO: 0,
} as const;

export function nivelViabilidad(puntaje: number): NivelViabilidad {
  if (puntaje >= 80) return "ALTA";
  if (puntaje >= 60) return "MEDIA";
  if (puntaje >= 40) return "BAJA";
  return "MUY_BAJA";
}

export function descripcionNivel(nivel: NivelViabilidad): string {
  switch (nivel) {
    case "ALTA":
      return "Aplicar directamente";
    case "MEDIA":
      return "Viable con gestiones previas";
    case "BAJA":
      return "Considerar consorcio";
    case "MUY_BAJA":
      return "No recomendado";
  }
}
