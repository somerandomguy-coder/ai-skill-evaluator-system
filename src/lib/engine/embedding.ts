import OpenAI from "openai";
import { isDemoMode, openaiApiKey } from "../env";

/**
 * Deterministic character 3-gram + term hashing vectorizer for offline, demo, and test modes.
 * Returns a unit-normalized vector of fixed dimensions (128 dimensions) so cosine similarity
 * gives precise, grounded similarity comparisons even without OpenAI API keys.
 */
function generateDeterministicVector(text: string, dimensions = 128): number[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = clean.split(/\s+/).filter(Boolean);
  const vec = new Float64Array(dimensions);

  // 1. Unigrams and word tokens
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) + hash + word.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1.0;

    // 2. Character 3-grams inside words for fuzzy matching
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.slice(i, i + 3);
        let triHash = 0;
        for (let j = 0; j < 3; j++) {
          triHash = ((triHash << 5) + triHash + trigram.charCodeAt(j)) | 0;
        }
        const triIdx = Math.abs(triHash) % dimensions;
        vec[triIdx] += 0.5;
      }
    }
  }

  // 3. Normalize vector to unit length
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  const result: number[] = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}

/**
 * Computes cosine similarity between two numeric vectors.
 * Returns a score between -1 and 1 (typically 0 to 1 for normalized vectors).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

let cachedOpenAi: OpenAI | null = null;

function getOpenAi(): OpenAI | null {
  const key = openaiApiKey();
  if (!key) return null;
  if (!cachedOpenAi) cachedOpenAi = new OpenAI({ apiKey: key });
  return cachedOpenAi;
}

/**
 * Generates an embedding vector for a given text.
 * Falls back transparently to deterministic unit-norm vectorizer if OpenAI is unavailable,
 * in demo mode, or during testing.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    return generateDeterministicVector("", 128);
  }

  // Check if live AI is available
  if (!isDemoMode()) {
    const ai = getOpenAi();
    if (ai) {
      try {
        const resp = await ai.embeddings.create({
          model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
          input: trimmed.slice(0, 8000),
        });
        if (resp.data?.[0]?.embedding) {
          return resp.data[0].embedding;
        }
      } catch (err) {
        console.warn("[generateEmbedding] OpenAI embedding failed, falling back to deterministic vectorizer:", err);
      }
    }
  }

  return generateDeterministicVector(trimmed, 128);
}
