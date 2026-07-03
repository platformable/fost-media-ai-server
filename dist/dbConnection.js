import { Pool } from "pg";
export const clientDataset = new Pool({
    user: process.env.DB_USER_DATASET,
    host: process.env.DB_HOST_DATASET,
    database: process.env.DATABASE_DATASET,
    password: process.env.DB_PASSWORD_DATASET,
    port: process.env.DB_PORT_DATASET ? parseInt(process.env.DB_PORT_DATASET) : undefined,
    // ssl: { rejectUnauthorized: false },
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
