import { Pool } from "pg"
import type { SearchResult } from "./Types.js"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function searchChunks(
  questionEmbedding: number[],
  limit = 5,
): Promise<SearchResult[]> {
  if (questionEmbedding.length !== 384) {
    throw new Error(
      `Invalid embedding dimensions: expected 384, got ${questionEmbedding.length}`,
    )
  }

  const vector = `[${questionEmbedding.join(",")}]`

  const result = await pool.query<SearchResult>(
    `
      SELECT
        id,
        chunk_index AS "chunkIndex",
        page_start AS "pageStart",
        page_end AS "pageEnd",
        section,
        subsection,
        content_type AS "contentType",
        content,
        embedding <=> $1::vector AS distance
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [vector, limit],
  )

  return result.rows
}
