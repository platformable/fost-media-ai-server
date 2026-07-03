import "dotenv/config"
import express, { Request, Response } from "express"
import { clientDataset } from "./dbConnection.js"
import { ask } from "./utils/aiSearch.js"
import { authenticate } from "./utils/auth.js"
// import { main, search } from "./utils/searchAI"

// const { QueryResult } = require("pg")
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
