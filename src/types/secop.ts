export type ProcessInputSource = "url" | "id";

export interface ParsedProcessInput {
  raw: string;
  id: string;
  source: ProcessInputSource;
}

export interface SecopProcess {
  id_del_proceso: string;
  nombre_del_procedimiento: string;
  entidad: string;
  precio_base: string | null;
  estado_del_procedimiento: string;
  modalidad_de_contratacion: string | null;
  fecha_de_publicacion_del: string | null;
  urlproceso: string;
}
