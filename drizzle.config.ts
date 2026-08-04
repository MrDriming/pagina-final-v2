import { defineConfig } from "drizzle-kit"
import * as dotenv from "dotenv"

// Forzamos la carga del archivo de variables
dotenv.config({ path: ".env.local" })

export default defineConfig({
  dialect: "postgresql", // 👈 Aseguramos que esté primero y bien definido
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
})