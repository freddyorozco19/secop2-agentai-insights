import type { ProcesoEstructurado } from "@/types/ai";

export const DEMO_PROCESS: ProcesoEstructurado = {
  objeto: "Consultoría para la transformación digital del Ministerio de Educación",
  valorEstimado: 620_000_000,
  fechaCierre: "2026-07-15",
  modalidad: "Licitación pública",
  duracion: "8 meses",
  habilitantesJuridicos: [
    "Inscripción vigente en el RUP",
    "Antigüedad mínima de 5 años",
    "Objeto social que incluya consultoría tecnológica",
  ],
  habilitantesFinancieros: [
    {
      campo: "Patrimonio líquido",
      operador: "mayor o igual",
      valor: 800_000_000,
      fuente: "Balance general 2024",
    },
    {
      campo: "Índice de liquidez",
      operador: "mayor o igual",
      valor: 1.5,
      fuente: "Balance general 2024",
    },
    {
      campo: "Índice de endeudamiento",
      operador: "menor o igual",
      valor: 0.6,
      fuente: "Balance general 2024",
    },
  ],
  habilitantesTecnicos: [],
  experienciaRequerida: [
    {
      descripcion: "Contratos de software o consultoría TI en sector público",
      cantidadContratos: 3,
      valorMinimo: 500_000_000,
      anosMaximos: 4,
    },
  ],
  equipoRequerido: [
    { rol: "Arquitecto de Software", requisitos: ["AWS Solutions Architect"] },
    { rol: "Gerente de Proyecto", requisitos: ["PMP"] },
    { rol: "Data Engineer", requisitos: [] },
  ],
  certificacionesRequeridas: ["ISO 27001", "ISO 9001"],
  cronograma: [
    { etapa: "Publicación", fecha: "2026-06-20" },
    { etapa: "Cierre de ofertas", fecha: "2026-07-15" },
    { etapa: "Evaluación", fecha: "2026-07-30" },
    { etapa: "Adjudicación", fecha: "2026-08-10" },
  ],
  fuenteDocumento: "pliego-demo-MinEducacion.pdf",
};
