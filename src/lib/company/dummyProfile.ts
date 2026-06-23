import type { EmpresaProfile } from "@/types/company";

export const DUMMY_PROFILE: EmpresaProfile = {
  nombre: "TechCorp Colombia SAS",
  nit: "900.123.456-1",
  sector: "Consultoría tecnológica",
  antiguedad: 8,

  capacidadJuridica: {
    rup: true,
    rupVencimiento: "2025-12-31",
    codigosUnspsc: ["80101500", "80111500", "43232200"],
    objetoSocial: [
      "desarrollo de software",
      "consultoría TI",
      "transformación digital",
    ],
  },

  capacidadFinanciera: {
    ingresoOperacional: 2_800_000_000,
    patrimonioLiquido: 1_200_000_000,
    indiceLiquidez: 1.8,
    indiceEndeudamiento: 0.42,
    capitalDeTrabajo: 650_000_000,
    anioBalance: 2024,
  },

  experiencia: [
    {
      entidad: "Ministerio de TIC",
      objeto: "Plataforma datos abiertos",
      valor: 850_000_000,
      año: 2023,
      duracion: "8 meses",
      tipo: "SOFTWARE",
    },
    {
      entidad: "Alcaldía de Medellín",
      objeto: "Sistema gestión documental",
      valor: 420_000_000,
      año: 2022,
      duracion: "6 meses",
      tipo: "SOFTWARE",
    },
    {
      entidad: "DNP",
      objeto: "Consultoría transformación digital",
      valor: 310_000_000,
      año: 2022,
      duracion: "4 meses",
      tipo: "CONSULTORIA",
    },
  ],

  equipo: [
    {
      nombre: "Carlos Ruiz",
      rol: "Arquitecto de Software",
      certificaciones: ["AWS SA"],
      experiencia: 8,
    },
    {
      nombre: "María López",
      rol: "Gerente de Proyecto",
      certificaciones: [],
      experiencia: 6,
    },
    {
      nombre: "Juan Torres",
      rol: "Data Engineer",
      certificaciones: ["GCP Professional"],
      experiencia: 4,
    },
  ],

  certificaciones: [
    { nombre: "ISO 9001:2015", vigencia: "2025-11-30" },
  ],
};
