import "dotenv/config"
import express, { Request, Response } from "express"
import { clientDataset } from "./dbConnection.js"
import { ask } from "./utils/aiSearch.js"
import { authenticate } from "./utils/auth.js"

import { getEmbedding } from "./utils/getEmbedding.js"
import { generateAnswer } from "./utils/generateAnswer.js"
import { buildContext } from "./utils/buildContext.js"
import { searchChunks } from "./utils/searchChunks.js"

import cors from "cors"
const app = express()
const port = 5700

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

app.get("/", authenticate, (req: Request, res: Response) => {
  async function verificarConexion() {
    try {
      // Ejecutar una consulta de prueba usando el pool directamente
      const response = await clientDataset.query("SELECT NOW()")
      console.log("¡Connected to PostgreSQL!")
      console.log("Server date and time:", response.rows[0].now)
      res.send("¡Connected to PostgreSQL!")
    } catch (err: any) {
      console.error("Error connecting to PostgreSQL:", err.message)
    } finally {
      // No cerrar el pool aquí: es compartido por toda la aplicación
    }
  }

  verificarConexion()
})

app.post("/api/search", authenticate, async (req, res) => {
  console.log("Received request:", req.query.question)
  try {
    const { question } = req.query as { question: string }

    const result = await ask(question)

    res.json(result)
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: "Internal server error",
    })
  }
})

app.post("/api/ask-reports", async (req, res) => {
  try {
    const { question } = req.body

    console.log("Received question:", question)

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "Question is required",
      })
    }

    const questionEmbedding = await getEmbedding(question)

    const chunks = await searchChunks(questionEmbedding, 5)

    const context = buildContext(chunks)

    const answer = await generateAnswer(question, context)

    return res.json({
      answer,
      sources: chunks.map((chunk) => ({
        page: chunk.pageStart,
        section: chunk.section,
        subsection: chunk.subsection,
        distance: chunk.distance,
      })),
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: "Failed to answer question",
    })
  }
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})

// Graceful shutdown: cerrar el pool al terminar la aplicación
process.on("SIGINT", async () => {
  console.log("Recibido SIGINT, cerrando pool de Postgres...")
  try {
    await clientDataset.end()
    console.log("Pool cerrado. Saliendo.")
  } catch (err: any) {
    console.error("Error cerrando pool:", err.message)
  }
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("Recibido SIGTERM, cerrando pool de Postgres...")
  try {
    await clientDataset.end()
    console.log("Pool cerrado. Saliendo.")
  } catch (err: any) {
    console.error("Error cerrando pool:", err.message)
  }
  process.exit(0)
})
