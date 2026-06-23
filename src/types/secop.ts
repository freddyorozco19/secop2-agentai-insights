export type ProcessInputSource = "url" | "id";

export interface ParsedProcessInput {
  raw: string;
  id: string;
  source: ProcessInputSource;
}

export interface SecopProcess {
  entidad: string | null;
  nit_entidad: string | null;
  departamento_entidad: string | null;
  ciudad_entidad: string | null;
  ordenentidad: string | null;
  codigo_pci: string | null;
  id_del_proceso: string;
  referencia_del_proceso: string | null;
  ppi: string | null;
  id_del_portafolio: string | null;
  nombre_del_procedimiento: string | null;
  descripci_n_del_procedimiento: string | null;
  fase: string | null;
  fecha_de_publicacion_del: string | null;
  fecha_de_ultima_publicaci: string | null;
  fecha_de_publicacion_fase_3: string | null;
  precio_base: number | null;
  modalidad_de_contratacion: string | null;
  justificaci_n_modalidad_de: string | null;
  duracion: number | null;
  unidad_de_duracion: string | null;
  ciudad_de_la_unidad_de: string | null;
  nombre_de_la_unidad_de: string | null;
  proveedores_invitados: number | null;
  proveedores_con_invitacion: number | null;
  visualizaciones_del: number | null;
  proveedores_que_manifestaron: number | null;
  respuestas_al_procedimiento: number | null;
  respuestas_externas: number | null;
  conteo_de_respuestas_a_ofertas: number | null;
  proveedores_unicos_con: number | null;
  numero_de_lotes: number | null;
  estado_del_procedimiento: string | null;
  id_estado_del_procedimiento: number | null;
  adjudicado: string | null;
  id_adjudicacion: number | null;
  codigoproveedor: string | null;
  departamento_proveedor: string | null;
  ciudad_proveedor: string | null;
  valor_total_adjudicacion: number | null;
  nombre_del_adjudicador: string | null;
  nombre_del_proveedor: string | null;
  nit_del_proveedor_adjudicado: string | null;
  codigo_principal_de_categoria: string | null;
  estado_de_apertura_del_proceso: string | null;
  tipo_de_contrato: string | null;
  subtipo_de_contrato: string | null;
  categorias_adicionales: string | null;
  urlproceso: string | null;
  codigo_entidad: number | null;
  estado_resumen: string | null;
}

export interface SecopSearchResult {
  id_del_proceso: string;
  nombre_del_procedimiento: string | null;
  entidad: string | null;
  estado_del_procedimiento: string | null;
  modalidad_de_contratacion: string | null;
  precio_base: number | null;
  fecha_de_publicacion_del: string | null;
  urlproceso: string | null;
}

export function toSearchResult(process: SecopProcess): SecopSearchResult {
  return {
    id_del_proceso: process.id_del_proceso,
    nombre_del_procedimiento: process.nombre_del_procedimiento,
    entidad: process.entidad,
    estado_del_procedimiento: process.estado_del_procedimiento,
    modalidad_de_contratacion: process.modalidad_de_contratacion,
    precio_base: process.precio_base,
    fecha_de_publicacion_del: process.fecha_de_publicacion_del,
    urlproceso: process.urlproceso,
  };
}
