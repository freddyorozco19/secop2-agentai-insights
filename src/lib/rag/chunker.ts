const CHUNK_SIZE_TOKENS = 500;
const OVERLAP_TOKENS = 50;
// Aproximación simple: ~4 caracteres por token en español/inglés
const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_CHARS = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

export interface DocumentChunk {
  text: string;
  index: number;
}

/**
 * Divide texto en chunks con overlap, intentando cortar en límites de párrafo
 * u oración para no partir ideas a la mitad.
 */
export function chunkDocument(text: string): DocumentChunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  if (clean.length <= CHUNK_SIZE_CHARS) {
    return [{ text: clean, index: 0 }];
  }

  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE_CHARS, clean.length);

    if (end < clean.length) {
      // Buscar el último salto de párrafo o punto antes del límite
      const slice = clean.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
      );
      if (lastBreak > CHUNK_SIZE_CHARS * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const text = clean.slice(start, end).trim();
    if (text) {
      chunks.push({ text, index });
      index += 1;
    }

    if (end >= clean.length) break;
    start = end - OVERLAP_CHARS;
  }

  return chunks;
}
