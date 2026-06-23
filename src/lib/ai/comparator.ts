import type { ProcesoEstructurado } from "@/types/ai";
import type { EmpresaProfile } from "@/types/company";
import {
  BrechaRequisito,
  AnalisisViabilidad,
  CategoriaRequisito,
  EstadoRequisito,
  NivelViabilidad,
  PESOS_POR_CATEGORIA,
  nivelViabilidad,
  descripcionNivel,
} from "@/types/ai";

interface ScoreCategory {
  categoria: CategoriaRequisito;
  pesoTotal: number;
  pesoObtenido: number;
  brechas: BrechaRequisito[];
}

function evaluarJuridicos(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
): BrechaRequisito[] {
  const brechas: BrechaRequisito[] = [];
  const pesoUnitario =
    proceso.habilitantesJuridicos.length > 0
      ? PESOS_POR_CATEGORIA.JURIDICO / proceso.habilitantesJuridicos.length
      : 0;

  for (const req of proceso.habilitantesJuridicos) {
    const reqLower = req.toLowerCase();
    let estado: EstadoRequisito = "NO_CUMPLE";
    let detalle = "";
    let recomendacion = "";

    if (reqLower.includes("rup") || reqLower.includes("registro único")) {
      const vencimiento = new Date(empresa.capacidadJuridica.rupVencimiento);
      const vigente = empresa.capacidadJuridica.rup && vencimiento > new Date();
      estado = vigente ? "CUMPLE" : "NO_CUMPLE";
      detalle = vigente
        ? `RUP activo hasta ${empresa.capacidadJuridica.rupVencimiento}.`
        : "RUP vencido o no inscrito.";
      recomendacion = vigente
        ? "Mantener RUP vigente."
        : "Renovar inscripción en el RUP antes de presentar oferta.";
    } else if (
      reqLower.includes("cámara") ||
      reqLower.includes("camara") ||
      reqLower.includes("objeto social")
    ) {
      estado = "CUMPLE";
      detalle = `Objeto social incluye: ${empresa.capacidadJuridica.objetoSocial.join(", ")}.`;
      recomendacion = "Verificar que el objeto del proceso encaje en el objeto social.";
    } else if (reqLower.includes("antigüedad") || reqLower.includes("antiguedad")) {
      estado = empresa.antiguedad >= 5 ? "CUMPLE" : "PARCIAL";
      detalle = `Empresa con ${empresa.antiguedad} años de antigüedad.`;
      recomendacion =
        empresa.antiguedad >= 5
          ? "Cumple antigüedad mínima."
          : "Considerar consorcio con empresa más antigua.";
    } else {
      estado = "NO_APLICA";
      detalle = `Requisito jurídico: "${req}". No se puede evaluar automáticamente.`;
      recomendacion = "Revisar manualmente contra la documentación de la empresa.";
    }

    brechas.push({
      requisito: req,
      categoria: "JURIDICO",
      estado,
      detalle,
      recomendacion,
      peso: pesoUnitario,
    });
  }

  return brechas;
}

function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function evaluarFinancieros(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
): BrechaRequisito[] {
  const brechas: BrechaRequisito[] = [];
  const pesoUnitario =
    proceso.habilitantesFinancieros.length > 0
      ? PESOS_POR_CATEGORIA.FINANCIERO / proceso.habilitantesFinancieros.length
      : 0;

  const camposEmpresa: Record<string, { valor: number; etiqueta: string }> = {
    "patrimonio liquido": {
      valor: empresa.capacidadFinanciera.patrimonioLiquido,
      etiqueta: "Patrimonio líquido",
    },
    "indice de liquidez": {
      valor: empresa.capacidadFinanciera.indiceLiquidez,
      etiqueta: "Índice de liquidez",
    },
    "indice de endeudamiento": {
      valor: empresa.capacidadFinanciera.indiceEndeudamiento,
      etiqueta: "Índice de endeudamiento",
    },
    "capital de trabajo": {
      valor: empresa.capacidadFinanciera.capitalDeTrabajo,
      etiqueta: "Capital de trabajo",
    },
    "capacidad financiera": {
      valor: empresa.capacidadFinanciera.ingresoOperacional,
      etiqueta: "Ingreso operacional",
    },
  };

  for (const req of proceso.habilitantesFinancieros) {
    const key = quitarAcentos(req.campo.toLowerCase().trim());
    const campoEmpresa = camposEmpresa[key];

    if (!campoEmpresa) {
      brechas.push({
        requisito: `${req.campo} ${req.operador} ${req.valor}`,
        categoria: "FINANCIERO",
        estado: "NO_APLICA",
        detalle: `No se encontró "${req.campo}" en el perfil financiero de la empresa.`,
        recomendacion: "Mapear manualmente este indicador al balance de la empresa.",
        peso: pesoUnitario,
      });
      continue;
    }

    const valorEmpresa = campoEmpresa.valor;
    let cumple = false;

    if (req.operador.includes("mayor")) {
      cumple = valorEmpresa > req.valor;
    } else if (req.operador.includes("menor")) {
      cumple = valorEmpresa < req.valor;
    } else if (req.operador.includes("igual")) {
      cumple = valorEmpresa === req.valor;
    } else {
      cumple = valorEmpresa >= req.valor;
    }

    const formatear = (v: number) =>
      v >= 1_000_000
        ? `$${(v / 1_000_000).toFixed(0)}M`
        : v.toString();

    brechas.push({
      requisito: `${req.campo} ${req.operador} ${formatear(req.valor)}`,
      categoria: "FINANCIERO",
      estado: cumple ? "CUMPLE" : "NO_CUMPLE",
      detalle: cumple
        ? `${campoEmpresa.etiqueta} de la empresa: ${formatear(valorEmpresa)}. Exige ${req.operador} ${formatear(req.valor)}.`
        : `${campoEmpresa.etiqueta} de la empresa: ${formatear(valorEmpresa)}. Exige ${req.operador} ${formatear(req.valor)}.`,
      recomendacion: cumple
        ? "Cumple el requisito financiero."
        : `Considerar consorcio o presentar garantía adicional para cubrir el déficit en ${req.campo}.`,
      peso: pesoUnitario,
    });
  }

  return brechas;
}

function evaluarExperiencia(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
): BrechaRequisito[] {
  const brechas: BrechaRequisito[] = [];
  const pesoUnitario =
    proceso.experienciaRequerida.length > 0
      ? PESOS_POR_CATEGORIA.EXPERIENCIA / proceso.experienciaRequerida.length
      : 0;

  for (const req of proceso.experienciaRequerida) {
    const anioActual = new Date().getFullYear();
    const contratosValidos = empresa.experiencia.filter((c) => {
      const dentroAnios =
        req.anosMaximos === null || c.año >= anioActual - req.anosMaximos;
      const cumpleValor =
        req.valorMinimo === null || c.valor >= req.valorMinimo;
      return dentroAnios && cumpleValor;
    });

    const cumpleCantidad = contratosValidos.length >= req.cantidadContratos;

    brechas.push({
      requisito: `${req.descripcion} (mín. ${req.cantidadContratos} contrato(s)${
        req.valorMinimo ? ` de $${(req.valorMinimo / 1_000_000).toFixed(0)}M` : ""
      }${req.anosMaximos ? ` últimos ${req.anosMaximos} años` : ""})`,
      categoria: "EXPERIENCIA",
      estado: cumpleCantidad
        ? "CUMPLE"
        : contratosValidos.length > 0
          ? "PARCIAL"
          : "NO_CUMPLE",
      detalle: cumpleCantidad
        ? `La empresa tiene ${contratosValidos.length} contrato(s) que cumplen los criterios.`
        : `La empresa tiene ${contratosValidos.length} contrato(s) válido(s), se exigen ${req.cantidadContratos}.`,
      recomendacion: cumpleCantidad
        ? "Cumple experiencia requerida."
        : `Faltan ${req.cantidadContratos - contratosValidos.length} contrato(s). Considerar consorcio con empresa que tenga experiencia en ${req.descripcion}.`,
      peso: pesoUnitario,
    });
  }

  return brechas;
}

function evaluarEquipo(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
): BrechaRequisito[] {
  const brechas: BrechaRequisito[] = [];
  const pesoUnitario =
    proceso.equipoRequerido.length > 0
      ? PESOS_POR_CATEGORIA.EQUIPO / proceso.equipoRequerido.length
      : 0;

  for (const req of proceso.equipoRequerido) {
    const rolLower = req.rol.toLowerCase();
    const candidatos = empresa.equipo.filter((m) =>
      m.rol.toLowerCase().includes(rolLower.split(" ")[0]),
    );

    if (candidatos.length === 0) {
      brechas.push({
        requisito: `Rol: ${req.rol}`,
        categoria: "EQUIPO",
        estado: "NO_CUMPLE",
        detalle: `No se encontró personal con el rol "${req.rol}".`,
        recomendacion: `Contratar o asociarse con un profesional para el rol de ${req.rol}.`,
        peso: pesoUnitario,
      });
      continue;
    }

    const requisitosCumplidos = req.requisitos.filter((r) =>
      candidatos.some((c) =>
        c.certificaciones.some((cert) =>
          cert.toLowerCase().includes(r.toLowerCase()),
        ),
      ),
    );

    const estado: EstadoRequisito =
      requisitosCumplidos.length === req.requisitos.length
        ? "CUMPLE"
        : requisitosCumplidos.length > 0
          ? "PARCIAL"
          : req.requisitos.length === 0
            ? "CUMPLE"
            : "NO_CUMPLE";

    brechas.push({
      requisito: `${req.rol} (${req.requisitos.join(", ") || "sin requisitos específicos"})`,
      categoria: "EQUIPO",
      estado,
      detalle:
        estado === "CUMPLE"
          ? `Candidato(s): ${candidatos.map((c) => c.nombre).join(", ")}.`
          : `Candidato(s) encontrado(s) pero faltan certificaciones: ${req.requisitos.filter((r) => !requisitosCumplidos.includes(r)).join(", ")}.`,
      recomendacion:
        estado === "CUMPLE"
          ? "Cumple requisitos de equipo."
          : `Certificar o contratar personal con: ${req.requisitos.filter((r) => !requisitosCumplidos.includes(r)).join(", ")}.`,
      peso: pesoUnitario,
    });
  }

  return brechas;
}

function evaluarCertificaciones(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
): BrechaRequisito[] {
  const brechas: BrechaRequisito[] = [];
  const pesoUnitario =
    proceso.certificacionesRequeridas.length > 0
      ? PESOS_POR_CATEGORIA.CERTIFICACION /
        proceso.certificacionesRequeridas.length
      : 0;

  for (const req of proceso.certificacionesRequeridas) {
    const reqLower = req.toLowerCase();
    const tiene = empresa.certificaciones.some((c) =>
      c.nombre.toLowerCase().includes(reqLower.split(":")[0]),
    );

    brechas.push({
      requisito: req,
      categoria: "CERTIFICACION",
      estado: tiene ? "CUMPLE" : "NO_CUMPLE",
      detalle: tiene
        ? `La empresa cuenta con certificación en ${req}.`
        : `La empresa NO cuenta con certificación en ${req}.`,
      recomendacion: tiene
        ? "Cumple certificación requerida."
        : `Obtener certificación ${req} o consorciarse con empresa certificada.`,
      peso: pesoUnitario,
    });
  }

  return brechas;
}

function calcularScore(brechas: BrechaRequisito[]): {
  puntaje: number;
  porCategoria: ScoreCategory[];
} {
  const categorias: CategoriaRequisito[] = [
    "JURIDICO",
    "FINANCIERO",
    "EXPERIENCIA",
    "EQUIPO",
    "CERTIFICACION",
  ];

  const porCategoria: ScoreCategory[] = categorias.map((categoria) => {
    const brechasCat = brechas.filter((b) => b.categoria === categoria);
    const pesoTotal = brechasCat.reduce((sum, b) => sum + b.peso, 0);

    const pesoObtenido = brechasCat.reduce((sum, b) => {
      if (b.estado === "CUMPLE") return sum + b.peso;
      if (b.estado === "PARCIAL") return sum + b.peso * 0.5;
      if (b.estado === "NO_APLICA") return sum + b.peso * 0.5;
      return sum;
    }, 0);

    return { categoria, pesoTotal, pesoObtenido, brechas: brechasCat };
  });

  const pesoTotalGlobal = porCategoria.reduce((s, c) => s + c.pesoTotal, 0);
  const pesoObtenidoGlobal = porCategoria.reduce(
    (s, c) => s + c.pesoObtenido,
    0,
  );

  const puntaje =
    pesoTotalGlobal > 0
      ? Math.round((pesoObtenidoGlobal / pesoTotalGlobal) * 100)
      : 0;

  return { puntaje, porCategoria };
}

function generarResumen(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
  brechas: BrechaRequisito[],
  nivel: NivelViabilidad,
): string {
  const cumplen = brechas.filter((b) => b.estado === "CUMPLE").length;
  const noCumplen = brechas.filter((b) => b.estado === "NO_CUMPLE").length;
  const parciales = brechas.filter((b) => b.estado === "PARCIAL").length;

  return (
    `Proceso: ${proceso.objeto || "No especificado"}. ` +
    `Modalidad: ${proceso.modalidad || "No especificada"}. ` +
    `Empresa evaluada: ${empresa.nombre}. ` +
    `De ${brechas.length} requisito(s) evaluado(s): ${cumplen} cumplen, ${parciales} parciales, ${noCumplen} no cumplen. ` +
    `Nivel de viabilidad: ${nivel} — ${descripcionNivel(nivel)}.`
  );
}

function generarRecomendaciones(brechas: BrechaRequisito[]): string[] {
  const recomendaciones = brechas
    .filter((b) => b.estado === "NO_CUMPLE" || b.estado === "PARCIAL")
    .map((b) => b.recomendacion);

  const unicas = [...new Set(recomendaciones)];
  return unicas.slice(0, 10);
}

export function compararProceso(
  proceso: ProcesoEstructurado,
  empresa: EmpresaProfile,
): AnalisisViabilidad {
  const brechas: BrechaRequisito[] = [
    ...evaluarJuridicos(proceso, empresa),
    ...evaluarFinancieros(proceso, empresa),
    ...evaluarExperiencia(proceso, empresa),
    ...evaluarEquipo(proceso, empresa),
    ...evaluarCertificaciones(proceso, empresa),
  ];

  const { puntaje } = calcularScore(brechas);
  const nivel = nivelViabilidad(puntaje);

  return {
    proceso: {
      objeto: proceso.objeto,
      valorEstimado: proceso.valorEstimado,
      modalidad: proceso.modalidad,
      fuenteDocumento: proceso.fuenteDocumento,
    },
    empresa: {
      nombre: empresa.nombre,
      nit: empresa.nit,
    },
    puntaje,
    nivel,
    brechas,
    resumenEjecutivo: generarResumen(proceso, empresa, brechas, nivel),
    recomendaciones: generarRecomendaciones(brechas),
  };
}
