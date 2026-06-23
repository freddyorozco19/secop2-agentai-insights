import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import type { ProcesoEstructurado } from "@/types/ai";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250514";
const MAX_TOKENS = 8192;
const MAX_CHARS_PER_CHUNK = 100_000;
const MAX_RETRIES = 2;

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ExtractionError(
      "ANTHROPIC_API_KEY no está configurada. No se puede extraer requisitos.",
    );
  }
  return new Anthropic({ apiKey });
}

function getModel(): string {
  return process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;
}

type PdfParseModule = { default: (data: Buffer) => Promise<{ text: string; numpages: number }> };

async function parsePdf(pdfBuffer: Buffer): Promise<{ text: string; numpages: number }> {
  try {
    const mod = (await import("pdf-parse")) as unknown as PdfParseModule;
    const result = await mod.default(pdfBuffer);
    return { text: result.text, numpages: result.numpages };
  } catch (error) {
    throw new ExtractionError(
      `No se pudo parsear el PDF: ${error instanceof Error ? error.message : "error desconocido"}`,
    );
  }
}

function chunkText(text: string, maxChars: number = MAX_CHARS_PER_CHUNK): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > maxChars) {
      if (current) chunks.push(current);
      if (paragraph.length > maxChars) {
        const sentences = paragraph.split(/(?<=[.])\s+/);
        let sentenceBuf = "";
        for (const sentence of sentences) {
          if (sentenceBuf.length + sentence.length + 1 > maxChars) {
            if (sentenceBuf) chunks.push(sentenceBuf);
            sentenceBuf = sentence;
          } else {
            sentenceBuf = sentenceBuf ? sentenceBuf + " " + sentence : sentence;
          }
        }
        if (sentenceBuf) current = sentenceBuf;
        else current = "";
      } else {
        current = paragraph;
      }
    } else {
      current = current ? current + "\n\n" + paragraph : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function callClaude(
  client: Anthropic,
  text: string,
  fuenteDocumento: string,
): Promise<ProcesoEstructurado> {
  const userPrompt = `Analiza el siguiente documento de un proceso de contratación pública colombiana y extrae los requisitos estructurados.

Fuente del documento: ${fuenteDocumento}

Contenido del documento:
---
${text}
---

Retorna el JSON estructurado según el schema definido.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: getModel(),
        max_tokens: MAX_TOKENS,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const jsonText = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");

      const cleaned = jsonText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as ProcesoEstructurado;
      return normalizeResult(parsed, fuenteDocumento);
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw new ExtractionError(
    `Claude no pudo extraer la estructura tras ${MAX_RETRIES + 1} intentos: ${lastError?.message ?? "error desconocido"}`,
  );
}

function normalizeResult(
  raw: Partial<ProcesoEstructurado>,
  fuenteDocumento: string,
): ProcesoEstructurado {
  return {
    objeto: raw.objeto ?? "",
    valorEstimado: raw.valorEstimado ?? 0,
    fechaCierre: raw.fechaCierre ?? null,
    modalidad: raw.modalidad ?? "",
    duracion: raw.duracion ?? "",
    habilitantesJuridicos: raw.habilitantesJuridicos ?? [],
    habilitantesFinancieros: raw.habilitantesFinancieros ?? [],
    habilitantesTecnicos: raw.habilitantesTecnicos ?? [],
    experienciaRequerida: raw.experienciaRequerida ?? [],
    equipoRequerido: raw.equipoRequerido ?? [],
    certificacionesRequeridas: raw.certificacionesRequeridas ?? [],
    cronograma: raw.cronograma ?? [],
    fuenteDocumento,
  };
}

export async function extractFromPDF(
  pdfBuffer: Buffer,
  fuenteDocumento: string = "documento.pdf",
): Promise<ProcesoEstructurado> {
  const client = getClient();
  const { text } = await parsePdf(pdfBuffer);

  if (!text || text.trim().length === 0) {
    throw new ExtractionError(
      "El PDF no contiene texto extraíble. Podría ser un PDF escaneado (se requiere OCR).",
    );
  }

  const chunks = chunkText(text);

  if (chunks.length === 1) {
    return callClaude(client, chunks[0], fuenteDocumento);
  }

  const partialResults = await Promise.all(
    chunks.map((chunk, index) =>
      callClaude(
        client,
        `Parte ${index + 1} de ${chunks.length}:\n\n${chunk}`,
        fuenteDocumento,
      ),
    ),
  );

  return mergeResults(partialResults, fuenteDocumento);
}

function mergeResults(
  partials: ProcesoEstructurado[],
  fuenteDocumento: string,
): ProcesoEstructurado {
  if (partials.length === 0) {
    return normalizeResult({}, fuenteDocumento);
  }
  if (partials.length === 1) return partials[0];

  const first = partials[0];
  const merged: ProcesoEstructurado = {
    objeto: first.objeto,
    valorEstimado: first.valorEstimado,
    fechaCierre: first.fechaCierre,
    modalidad: first.modalidad,
    duracion: first.duracion,
    habilitantesJuridicos: [
      ...new Set(partials.flatMap((p) => p.habilitantesJuridicos)),
    ],
    habilitantesFinancieros: partials.flatMap((p) => p.habilitantesFinancieros),
    habilitantesTecnicos: [
      ...new Set(partials.flatMap((p) => p.habilitantesTecnicos)),
    ],
    experienciaRequerida: partials.flatMap((p) => p.experienciaRequerida),
    equipoRequerido: partials.flatMap((p) => p.equipoRequerido),
    certificacionesRequeridas: [
      ...new Set(partials.flatMap((p) => p.certificacionesRequeridas)),
    ],
    cronograma: partials.flatMap((p) => p.cronograma),
    fuenteDocumento,
  };

  for (const p of partials.slice(1)) {
    if (!merged.objeto && p.objeto) merged.objeto = p.objeto;
    if (merged.valorEstimado === 0 && p.valorEstimado)
      merged.valorEstimado = p.valorEstimado;
    if (!merged.fechaCierre && p.fechaCierre) merged.fechaCierre = p.fechaCierre;
    if (!merged.modalidad && p.modalidad) merged.modalidad = p.modalidad;
    if (!merged.duracion && p.duracion) merged.duracion = p.duracion;
  }

  return merged;
}

export { parsePdf, chunkText };
