import Anthropic from "@anthropic-ai/sdk";
import { RAG_EVALUATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { calcularScore, generarRecomendaciones } from "@/lib/ai/scoring";
import { generateEmbeddings } from "@/lib/rag/embeddings";
import { similaritySearch } from "@/lib/rag/qdrant";
import type {
  AnalisisViabilidad,
  BrechaRequisito,
  CategoriaRequisito,
  EstadoRequisito,
  ProcesoEstructurado,
} from "@/types/ai";
import { PESOS_POR_CATEGORIA, nivelViabilidad, descripcionNivel } from "@/types/ai";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250514";
const MAX_TOKENS = 8192;
const MAX_RETRIES = 2;
const TOP_K_PER_REQUISITO = 4;

export class RAGAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RAGAgentError";
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new RAGAgentError("ANTHROPIC_API_KEY no está configurada.");
  }
  return new Anthropic({ apiKey });
}

function getModel(): string {
  return process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;
}

interface RequisitoInput {
  texto: string;
  categoria: CategoriaRequisito;
  peso: number;
}

/** Reúne todos los requisitos del proceso en una lista plana, con su peso unitario por categoría. */
function collectRequisitos(proceso: ProcesoEstructurado): RequisitoInput[] {
  const out: RequisitoInput[] = [];

  const pesoUnitario = (categoria: CategoriaRequisito, total: number) =>
    total > 0 ? PESOS_POR_CATEGORIA[categoria] / total : 0;

  const pesoJ = pesoUnitario("JURIDICO", proceso.habilitantesJuridicos.length);
  proceso.habilitantesJuridicos.forEach((r) =>
    out.push({ texto: r, categoria: "JURIDICO", peso: pesoJ }),
  );

  const pesoF = pesoUnitario("FINANCIERO", proceso.habilitantesFinancieros.length);
  proceso.habilitantesFinancieros.forEach((r) =>
    out.push({
      texto: `${r.campo} ${r.operador} ${r.valor} (fuente: ${r.fuente})`,
      categoria: "FINANCIERO",
      peso: pesoF,
    }),
  );

  const pesoE = pesoUnitario("EXPERIENCIA", proceso.experienciaRequerida.length);
  proceso.experienciaRequerida.forEach((r) =>
    out.push({
      texto: `${r.descripcion} — mínimo ${r.cantidadContratos} contrato(s)${
        r.valorMinimo ? ` de al menos $${r.valorMinimo.toLocaleString("es-CO")}` : ""
      }${r.anosMaximos ? ` en los últimos ${r.anosMaximos} años` : ""}`,
      categoria: "EXPERIENCIA",
      peso: pesoE,
    }),
  );

  const pesoQ = pesoUnitario("EQUIPO", proceso.equipoRequerido.length);
  proceso.equipoRequerido.forEach((r) =>
    out.push({
      texto: `Rol: ${r.rol}. Requisitos: ${r.requisitos.join(", ") || "sin requisitos específicos"}`,
      categoria: "EQUIPO",
      peso: pesoQ,
    }),
  );

  const pesoC = pesoUnitario(
    "CERTIFICACION",
    proceso.certificacionesRequeridas.length,
  );
  proceso.certificacionesRequeridas.forEach((r) =>
    out.push({ texto: r, categoria: "CERTIFICACION", peso: pesoC }),
  );

  return out;
}

/** Variaciones simples del requisito para mejorar el recall de la búsqueda semántica — sin costo de Claude. */
function expandQuery(texto: string): string[] {
  return [
    texto,
    `evidencia de cumplimiento: ${texto}`,
    `documento que respalda: ${texto}`,
  ];
}

interface ChunkEvidencia {
  text: string;
  sourceFile: string;
  score: number;
}

async function buscarEvidencia(
  requisito: string,
  tenantId: string,
): Promise<ChunkEvidencia[]> {
  const variantes = expandQuery(requisito);
  const vectores = await generateEmbeddings(variantes);

  const vistos = new Map<string, ChunkEvidencia>();

  for (const vector of vectores) {
    const resultados = await similaritySearch(
      vector,
      { tenantId, refType: "client" },
      TOP_K_PER_REQUISITO,
    );
    for (const r of resultados) {
      const key = `${r.metadata.sourceFile}#${r.metadata.chunkIndex}`;
      const existente = vistos.get(key);
      if (!existente || r.score > existente.score) {
        vistos.set(key, {
          text: r.metadata.text,
          sourceFile: r.metadata.sourceFile,
          score: r.score,
        });
      }
    }
  }

  return [...vistos.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K_PER_REQUISITO);
}

interface RequisitoConEvidencia extends RequisitoInput {
  evidencia: ChunkEvidencia[];
}

interface EvaluacionClaude {
  estado: EstadoRequisito;
  detalle: string;
  recomendacion: string;
  citas: string[];
}

function buildEvaluationPrompt(requisitos: RequisitoConEvidencia[]): string {
  const bloques = requisitos.map((r, i) => {
    const evidenciaTexto =
      r.evidencia.length === 0
        ? "(sin fragmentos relevantes encontrados en los documentos de la empresa)"
        : r.evidencia
            .map((e) => `[${e.sourceFile}]: "${e.text}"`)
            .join("\n");

    return `### Requisito ${i + 1} (categoría: ${r.categoria})
Texto: ${r.texto}

Evidencia recuperada:
${evidenciaTexto}`;
  });

  return `Evalúa los siguientes ${requisitos.length} requisitos en el mismo orden:\n\n${bloques.join("\n\n")}`;
}

async function evaluarConClaude(
  requisitos: RequisitoConEvidencia[],
): Promise<EvaluacionClaude[]> {
  if (requisitos.length === 0) return [];

  const client = getClient();
  const userPrompt = buildEvaluationPrompt(requisitos);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: getModel(),
        max_tokens: MAX_TOKENS,
        system: RAG_EVALUATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const jsonText = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      const cleaned = jsonText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as EvaluacionClaude[];
      if (!Array.isArray(parsed) || parsed.length !== requisitos.length) {
        throw new Error(
          `Respuesta de Claude no coincide en longitud (${parsed?.length} vs ${requisitos.length} esperados).`,
        );
      }
      return parsed;
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        continue;
      }
    }
  }

  throw new RAGAgentError(
    `Claude no pudo evaluar los requisitos tras ${MAX_RETRIES + 1} intentos: ${lastError?.message ?? "error desconocido"}`,
  );
}

/**
 * Analiza un proceso SECOP contra la documentación real del cliente indexada
 * en Qdrant (S8/S9), en vez del perfil dummy hardcodeado (S5).
 *
 * Por cada requisito: expande la consulta, busca evidencia semántica en los
 * documentos del cliente, y evalúa cumplimiento con Claude usando solo esa
 * evidencia — con citas a los archivos fuente.
 */
export async function analizarConRAG(
  proceso: ProcesoEstructurado,
  tenantId: string,
  empresaNombre: string = tenantId,
  empresaNit: string = "N/A",
): Promise<AnalisisViabilidad> {
  const requisitos = collectRequisitos(proceso);

  const requisitosConEvidencia: RequisitoConEvidencia[] = await Promise.all(
    requisitos.map(async (r) => ({
      ...r,
      evidencia: await buscarEvidencia(r.texto, tenantId),
    })),
  );

  const evaluaciones = await evaluarConClaude(requisitosConEvidencia);

  const brechas: BrechaRequisito[] = requisitosConEvidencia.map((r, i) => {
    const ev = evaluaciones[i];
    return {
      requisito: r.texto,
      categoria: r.categoria,
      estado: ev.estado,
      detalle: ev.detalle,
      recomendacion: ev.recomendacion,
      peso: r.peso,
      citas: ev.citas,
    };
  });

  const { puntaje } = calcularScore(brechas);
  const nivel = nivelViabilidad(puntaje);

  const cumplen = brechas.filter((b) => b.estado === "CUMPLE").length;
  const noCumplen = brechas.filter((b) => b.estado === "NO_CUMPLE").length;
  const parciales = brechas.filter((b) => b.estado === "PARCIAL").length;

  const resumenEjecutivo =
    `Proceso: ${proceso.objeto || "No especificado"}. ` +
    `Modalidad: ${proceso.modalidad || "No especificada"}. ` +
    `Análisis basado en documentación real de ${empresaNombre} (RAG). ` +
    `De ${brechas.length} requisito(s) evaluado(s): ${cumplen} cumplen, ${parciales} parciales, ${noCumplen} no cumplen. ` +
    `Nivel de viabilidad: ${nivel} — ${descripcionNivel(nivel)}.`;

  return {
    proceso: {
      objeto: proceso.objeto,
      valorEstimado: proceso.valorEstimado,
      modalidad: proceso.modalidad,
      fuenteDocumento: proceso.fuenteDocumento,
    },
    empresa: { nombre: empresaNombre, nit: empresaNit },
    puntaje,
    nivel,
    brechas,
    resumenEjecutivo,
    recomendaciones: generarRecomendaciones(brechas),
  };
}
