import "dotenv/config"
import { GoogleGenAI } from "@google/genai"
import OpenAI from "openai"

import { pipeline } from "@xenova/transformers"
import { clientDataset } from "../dbConnection.js"

// -----------------------------------------
// Google Gemini
// -----------------------------------------

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})
// -----------------------------------------
// Embedding model (singleton)
// -----------------------------------------

let extractor: any

async function getExtractor() {
  if (!extractor) {
    console.log("Loading embedding model...")
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    console.log("Embedding model loaded.")
  }

  return extractor
}

// -----------------------------------------
// Vector Search
// -----------------------------------------

async function search(question: string, limit = 5) {
  const model = await getExtractor()

  const output = await model(question, {
    pooling: "mean",
    normalize: true,
  })

  const embedding = JSON.stringify(Array.from(output.data))

  const result = await clientDataset.query(
    `
    SELECT
        id,
        content,
        metadata,
        embedding <=> $1::vector AS distance
    FROM conference_chunks
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    [embedding, limit],
  )

  return result.rows
}

// -----------------------------------------
// Prompt builder
// -----------------------------------------

function buildPrompt(question: string, docs: any[]) {
  const context = docs
    .map((doc, index) => {
      return `
Source ${index + 1}

Speaker: ${doc.metadata?.speaker ?? "Unknown"}

Conference: ${doc.metadata?.conference ?? ""}

Transcript:

${doc.content}
`
    })
    .join("\n\n------------------------\n\n")

  return `
You are an AI assistant specialised in conference talks.



Rules:
-Answer ONLY using the supplied transcript excerpts. Give the answers as the direct quotes from the transcripts.
- Never invent information.
- If the answer is not present, say you don't know.
- Provide one quote per speaker showing what they said about the topic. Show up to three quotes.
- Mention the speaker involved, the name of their talk and what conference they said it at. (from metadata)
- Keep the answer under 250 words.

Context:

${context}

Question:

${question}
`
}

// -----------------------------------------
// Ask AI
// -----------------------------------------

async function ask(question: string) {
  const docs = await search(question, 255)

  const prompt = buildPrompt(question, docs)

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
  })

  return {
    answer: response.text,
    sources: docs.map((doc: any) => ({
      id: doc.id,
      speaker: doc.metadata?.speaker,
      conference: doc.metadata?.conference,
      distance: doc.distance,
    })),
    chunks: docs,
  }
}

export { search, ask }
