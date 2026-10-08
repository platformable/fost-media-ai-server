import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash"

const SYSTEM_PROMPT = `
You are an assistant answering questions about the report:

"The API Economy in the Age of AI:
State of the Market Report 2026 Edition"

Your task is to answer the user's question using ONLY
the information contained in the provided report context.

Rules:

1. Do not use outside knowledge.
2. Do not invent facts, statistics, examples, companies, or conclusions.
3. If the provided context does not contain enough information
   to answer the question, explicitly say so.
4. Base the answer on the report's terminology and wording.
5. When relevant, mention the page number or section where
   the information appears.
6. If multiple sources support the answer, synthesize them.
7. Do not mention "the context", "chunks", "embeddings",
   "vector search", or other implementation details.
8. Answer naturally and concisely.
`

export async function generateAnswer(
  question: string,
  context: string,
): Promise<string> {
  if (!question.trim()) {
    throw new Error("Question cannot be empty")
  }

  if (!context.trim()) {
    throw new Error("Context cannot be empty")
  }

  const prompt = `
REPORT CONTEXT
==============

${context}

==============

USER QUESTION
==============

${question}

==============

Answer the user's question based only on the report
context above.
`

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      maxOutputTokens: 1000,
    },
  })

  const answer = response.text?.trim()

  if (!answer) {
    throw new Error("Gemini returned an empty response")
  }

  return answer
}
