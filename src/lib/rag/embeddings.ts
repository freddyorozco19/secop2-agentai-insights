import OpenAI from "openai";

const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }
  client = new OpenAI({ apiKey });
  return client;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const [vector] = await generateEmbeddings([text]);
  return vector;
}

export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const c = getClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await c.embeddings.create({
      model: MODEL,
      input: batch,
    });
    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}
