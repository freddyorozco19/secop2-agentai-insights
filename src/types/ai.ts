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
