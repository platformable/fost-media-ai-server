import { pipeline } from "@xenova/transformers"

let extractor: any = null

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) {
    throw new Error("Cannot generate embedding for empty text")
  }

  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  })

  return Array.from(output.data as Float32Array)
}
