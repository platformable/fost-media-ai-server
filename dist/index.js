import "dotenv/config";
import express from "express";
import { clientDataset } from "./dbConnection.js";
import { ask } from "./utils/aiSearch.js";
// import { main, search } from "./utils/searchAI"
// const { QueryResult } = require("pg")
import cors from "cors";
const app = express();
const port = 5700;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.get("/", (req, res) => {
    async function verificarConexion() {
        try {
            // Ejecutar una consulta de prueba usando el pool directamente
            const response = await clientDataset.query("SELECT NOW()");
            console.log("¡Conexión exitosa a PostgreSQL!");
            console.log("Fecha y hora del servidor:", response.rows[0].now);
            res.send("¡Conexión exitosa a PostgreSQL!");
        }
        catch (err) {
            console.error("Error al conectar a PostgreSQL:", err.message);
        }
        finally {
            // No cerrar el pool aquí: es compartido por toda la aplicación
        }
    }
    verificarConexion();
});
app.post("/api/search", async (req, res) => {
    try {
        const { question } = req.query;
        const result = await ask(question);
        res.json(result);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error",
        });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
// Graceful shutdown: cerrar el pool al terminar la aplicación
process.on("SIGINT", async () => {
    console.log("Recibido SIGINT, cerrando pool de Postgres...");
    try {
        await clientDataset.end();
        console.log("Pool cerrado. Saliendo.");
    }
    catch (err) {
        console.error("Error cerrando pool:", err.message);
    }
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.log("Recibido SIGTERM, cerrando pool de Postgres...");
    try {
        await clientDataset.end();
        console.log("Pool cerrado. Saliendo.");
    }
    catch (err) {
        console.error("Error cerrando pool:", err.message);
    }
    process.exit(0);
});
