export type ContentType =
  | "text"
  | "table"
  | "chart"
  | "timeline"
  | "list"
  | "bibliography"
  | "separator"
  | "metadata"

export interface DocumentChunk {
  id: number
  chunkIndex: number
  pageStart: number
  pageEnd: number
  section: string | null
  subsection: string | null
  contentType: ContentType
  content: string
}

export interface SearchResult extends DocumentChunk {
  distance: number
}

export interface Source {
  pageStart: number
  pageEnd: number
  section: string | null
  subsection: string | null
  contentType: ContentType
  distance: number
}

export interface AskResult {
  answer: string
  sources: Source[]
}
