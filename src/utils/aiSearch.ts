import "dotenv/config"
import { GoogleGenAI, Type } from "@google/genai"
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

async function search(question: string, limit = 25) {
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

Talk: ${doc.metadata?.talkName ?? doc.metadata?.talk ?? "Unknown"}

Conference: ${doc.metadata?.conference ?? ""}

Transcript:

${doc.content}
`
    })
    .join("\n\n------------------------\n\n")

  return `
You are an AI assistant specialised in conference talks.





Rules:
- Answer ONLY using the supplied transcript excerpts. Give the answers as the direct quotes from the transcripts.
- Never invent information.
- Return an empty array ONLY if none of the supplied excerpts is semantically related to the question.
- Provide one quote per speaker showing what they said about the topic.
- Extract the 3 most insightful technical statements from this talk.
- Ignore greetings, introductions, and generic observations.
- Separate the speaker's first name, last name, role and company.
- Keep the overall text under 250 words.

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
  const docs = await search(question, 25)

  const prompt = buildPrompt(question, docs)

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "A list of quotes answering the user's question.",
        items: {
          type: Type.OBJECT,
          properties: {
            firstName: {
              type: Type.STRING,
              description: "Speaker's first name",
            },
            lastName: { type: Type.STRING, description: "Speaker's last name" },
            talkName: { type: Type.STRING },
            role: { type: Type.STRING, description: "Speaker's role" },
            company: { type: Type.STRING, description: "Speaker's company" },
            conference: { type: Type.STRING },
            quote: {
              type: Type.STRING,
              description: "Direct quote from the transcript",
            },
          },
          required: [
            "firstName",
            "lastName",
            "talkName",
            "role",
            "company",
            "conference",
            "quote",
          ],
        },
      },
    },
  })

  // Parse the strict JSON directly
  let answer = []
  if (response?.text) {
    try {
      answer = JSON.parse(response.text)
    } catch (e) {
      console.error("Failed to parse JSON response", e)
    }
  }

  return {
    answer,
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
