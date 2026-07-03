"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.main = main;
// search.js
require("dotenv").config();
const { pipeline } = require("@xenova/transformers");
const db = require("../dbConnection");
// -----------------------------------------
// Configuración PostgreSQL
// -----------------------------------------
// -----------------------------------------
// Cargar el modelo UNA sola vez
// -----------------------------------------
console.log("Cargando modelo de embeddings...");
console.log("Modelo cargado.");
// -----------------------------------------
// Buscar
// -----------------------------------------
async function search(question, limit = 5) {
    let extractorInstance = null;
    async function getExtractor() {
        if (!extractorInstance) {
            console.log("Cargando modelo...");
            extractorInstance = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        }
        return extractorInstance;
    }
    const extractor = await getExtractor();
    const output = await extractor(question, {
        pooling: "mean",
        normalize: true,
    });
    const embedding = Array.from(output.data);
    const embeddingString = JSON.stringify(embedding);
    // Buscar en PostgreSQL
    const result = await db.query(`
SELECT
    id,
    content,
    metadata,
    embedding <=> $1::vector AS distance

FROM conference_chunks

ORDER BY embedding <=> $1::vector

LIMIT $2
`, [embeddingString, limit]);
    return result.rows;
}
// -----------------------------------------
// Main
// -----------------------------------------
async function main(question, limit = 1) {
    // No need to call db.connect() or db.end() when using a shared Pool.
    // Use `db.query()` (the Pool) which manages clients internally.
    const results = await search(question, limit);
    console.log("\nResultados encontrados:\n");
    for (const row of results) {
        console.log("------------------------------------");
        console.log("ID:", row.id);
        console.log("Speaker:", row.metadata.speaker);
        console.log("Distance:", row.distance);
        console.log("Content:", row.content);
        console.log("\n");
    }
    return results;
    // Do not call `db.end()` here; end the pool only on app shutdown.
}
