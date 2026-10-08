import type { SearchResult } from "./Types.js"
export function buildContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return "No relevant information was found in the report."
  }

  return chunks
    .map((chunk, index) => {
      const page =
        chunk.pageStart === chunk.pageEnd
          ? `Page ${chunk.pageStart}`
          : `Pages ${chunk.pageStart}-${chunk.pageEnd}`

      return `
SOURCE ${index + 1}
${page}
Section: ${chunk.section ?? "Unknown"}
Subsection: ${chunk.subsection ?? "Unknown"}
Content type: ${chunk.contentType}
Similarity distance: ${chunk.distance.toFixed(4)}

${chunk.content}
`.trim()
    })
    .join("\n\n---\n\n")
}
