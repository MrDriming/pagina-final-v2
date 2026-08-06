import { defineConfig } from "vitest/config"
import path from "node:path"
import * as dotenv from "dotenv"

// Los tests de integración de lib/notas.ts y lib/catedras.ts necesitan
// DATABASE_URL y el bypass de desarrollo (DEV_BYPASS_AUTH). Se pasan como
// `test.env` (no basta con `dotenv.config()` acá) para que lleguen también
// al proceso/worker donde corren los tests, no solo a este archivo de
// configuración.
const envLocal = dotenv.config({ path: ".env.local" }).parsed ?? {}

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    env: envLocal,
  },
  resolve: {
    // process.cwd(), no __dirname: en un config .ts cargado por Vite,
    // __dirname puede quedar indefinido según cómo se transpile.
    alias: {
      // Los módulos server-only (lib/notas.ts, lib/catedras.ts, lib/db) tiran
      // si se importan fuera de un Server Component. En tests de integración
      // necesitamos importarlos igual, así que apuntamos el paquete al
      // stub vacío que ya trae node_modules/server-only.
      "server-only": path.resolve(process.cwd(), "node_modules/server-only/empty.js"),
      "@": path.resolve(process.cwd()),
    },
  },
})
