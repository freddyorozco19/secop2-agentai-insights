import { chunkDocument } from "@/lib/rag/chunker";
import { generateEmbeddings } from "@/lib/rag/embeddings";
import {
  upsertPoints,
  deleteByRef,
  type RefType,
  type VectorPoint,
} from "@/lib/rag/qdrant";
import { randomUUID } from "crypto";

export interface IndexDocumentInput {
  tenantId: string;
  refType: RefType;
  refId: string;
  sourceFile: string;
  text: string;
}

/**
 * Indexa un documento completo: lo divide en chunks, genera embeddings
 * en batch y los sube a Qdrant. Borra primero los chunks previos del mismo
 * sourceFile para evitar duplicados si el documento se re-sube.
 */
export async function indexDocument(input: IndexDocumentInput): Promise<{
  chunksIndexed: number;
}> {
  const { tenantId, refType, refId, sourceFile, text } = input;

  const chunks = chunkDocument(text);
  if (chunks.length === 0) return { chunksIndexed: 0 };

  const vectors = await generateEmbeddings(chunks.map((c) => c.text));

  const points: VectorPoint[] = chunks.map((chunk, i) => ({
    id: randomUUID(),
    vector: vectors[i],
    metadata: {
      tenantId,
      refType,
      refId,
      sourceFile,
      chunkIndex: chunk.index,
      text: chunk.text,
    },
  }));

  await upsertPoints(points);
  return { chunksIndexed: points.length };
}

/** Indexa un documento del proceso SECOP (pliego, estudios previos, etc). */
export async function indexProcessDocument(
  tenantId: string,
  noticeUID: string,
  sourceFile: string,
  text: string,
): Promise<{ chunksIndexed: number }> {
  return indexDocument({
    tenantId,
    refType: "secop",
    refId: noticeUID,
    sourceFile,
    text,
  });
}

/** Indexa un documento de la empresa cliente (perfil financiero, HV, certificación). */
export async function indexCompanyDocument(
  tenantId: string,
  clientId: string,
  sourceFile: string,
  text: string,
): Promise<{ chunksIndexed: number }> {
  return indexDocument({
    tenantId,
    refType: "client",
    refId: clientId,
    sourceFile,
    text,
  });
}

export async function reindexDocument(
  input: IndexDocumentInput,
): Promise<{ chunksIndexed: number }> {
  await deleteByRef(input.tenantId, input.refType, input.refId);
  return indexDocument(input);
}
