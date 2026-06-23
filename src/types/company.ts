export interface CapacidadJuridica {
  rup: boolean;
  rupVencimiento: string;
  codigosUnspsc: string[];
  objetoSocial: string[];
}

export interface CapacidadFinanciera {
  ingresoOperacional: number;
  patrimonioLiquido: number;
  indiceLiquidez: number;
  indiceEndeudamiento: number;
  capitalDeTrabajo: number;
  anioBalance: number;
}

export interface ExperienciaEmpresa {
  entidad: string;
  objeto: string;
  valor: number;
  año: number;
  duracion: string;
  tipo: string;
}

export interface MiembroEquipo {
  nombre: string;
  rol: string;
  certificaciones: string[];
  experiencia: number;
}

export interface CertificacionEmpresa {
  nombre: string;
  vigencia: string;
}

export interface EmpresaProfile {
  nombre: string;
  nit: string;
  sector: string;
  antiguedad: number;
  capacidadJuridica: CapacidadJuridica;
  capacidadFinanciera: CapacidadFinanciera;
  experiencia: ExperienciaEmpresa[];
  equipo: MiembroEquipo[];
  certificaciones: CertificacionEmpresa[];
}
