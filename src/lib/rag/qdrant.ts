import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = process.env.QDRANT_COLLECTION ?? "secop_knowledge";
const VECTOR_SIZE = 1536; // text-embedding-3-small

let client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (client) return client;

  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error("QDRANT_URL no está configurada.");
  }

  client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });
  return client;
}

export type RefType = "secop" | "client";

export interface ChunkMetadata {
  tenantId: string;
  refType: RefType;
  refId: string; // noticeUID o clientId
  sourceFile: string;
  chunkIndex: number;
  text: string;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  metadata: ChunkMetadata;
}

/** Crea la collection si no existe. Idempotente — seguro de llamar en cada arranque. */
export async function ensureCollection(): Promise<void> {
  const c = getClient();
  const collections = await c.getCollections();
  const exists = collections.collections.some(
    (col) => col.name === COLLECTION_NAME,
  );

  if (!exists) {
    await c.createCollection(COLLECTION_NAME, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    // Índices de payload para filtrar rápido por tenant/proceso/cliente
    await c.createPayloadIndex(COLLECTION_NAME, {
      field_name: "tenantId",
      field_schema: "keyword",
    });
    await c.createPayloadIndex(COLLECTION_NAME, {
      field_name: "refType",
      field_schema: "keyword",
    });
    await c.createPayloadIndex(COLLECTION_NAME, {
      field_name: "refId",
      field_schema: "keyword",
    });
  }
}

export async function upsertPoints(points: VectorPoint[]): Promise<void> {
  if (points.length === 0) return;
  const c = getClient();
  await ensureCollection();

  await c.upsert(COLLECTION_NAME, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.metadata as unknown as Record<string, unknown>,
    })),
  });
}

export interface SearchFilter {
  tenantId: string;
  refType?: RefType;
  refId?: string;
}

export interface SearchResult {
  score: number;
  metadata: ChunkMetadata;
}

export async function similaritySearch(
  vector: number[],
  filter: SearchFilter,
  limit: number = 5,
): Promise<SearchResult[]> {
  const c = getClient();
  await ensureCollection();

  const must: Record<string, unknown>[] = [
    { key: "tenantId", match: { value: filter.tenantId } },
  ];
  if (filter.refType) {
    must.push({ key: "refType", match: { value: filter.refType } });
  }
  if (filter.refId) {
    must.push({ key: "refId", match: { value: filter.refId } });
  }

  const result = await c.search(COLLECTION_NAME, {
    vector,
    limit,
    filter: { must },
    with_payload: true,
  });

  return result.map((r) => ({
    score: r.score,
    metadata: r.payload as unknown as ChunkMetadata,
  }));
}

/** Borra todos los puntos de un refId específico (ej. al re-indexar un documento). */
export async function deleteByRef(
  tenantId: string,
  refType: RefType,
  refId: string,
): Promise<void> {
  const c = getClient();
  await ensureCollection();

  await c.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [
        { key: "tenantId", match: { value: tenantId } },
        { key: "refType", match: { value: refType } },
        { key: "refId", match: { value: refId } },
      ],
    },
  });
}

export async function healthCheck(): Promise<boolean> {
  try {
    const c = getClient();
    await c.getCollections();
    return true;
  } catch {
    return false;
  }
}
